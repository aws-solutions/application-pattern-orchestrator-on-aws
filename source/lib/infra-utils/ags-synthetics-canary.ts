/* 
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  
  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  
      http://www.apache.org/licenses/LICENSE-2.0
  
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as synthetics from '@aws-cdk/aws-synthetics-alpha';
import { Construct } from 'constructs';
import { Aspects, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { AWSSecureBucket } from './aws-secure-bucket';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import { CfnNagResourcePathEndingWithSuppressionAspect } from '../cfn-nag-suppression';

export interface AWSSyntheticsCanaryProps {
    /**
     * Name of the canary, must match ^[0-9a-z_\-]+$
     *
     * @required
     */
    readonly canaryName: string;

    /**
     * Specify the runtime version to use for the canary.
     *
     * @required
     */
    readonly runtime: synthetics.Runtime;

    /**
     * The type of test that you want your canary to run.
     *
     * @required
     */
    readonly test: synthetics.Test;

    /**
     * Specify the schedule for how often the canary runs.
     *
     * @optional
     * @default Once every 5 minutes (rate(5 minutes))
     */
    readonly schedule?: synthetics.Schedule;

    /**
     * Whether or not the canary should start after creation.
     *
     * @optional
     * @default true
     */
    readonly startAfterCreation?: boolean;

    /**
     * Environment variables to be passed into canary test script
     *
     * @optional
     */
    readonly environmentVariables?: Record<string, string>;

    /**
     * Canary test timeout in seconds
     *
     * @optional
     * @default 15 seconds
     */
    readonly timeoutInSeconds?: number;

    /**
     * VPC configuration if canary will run inside the VPC
     *
     * @optional
     * @default Canary will run without VPC
     */
    readonly vpc?: ec2.IVpc;

    /**
     * The S3 bucket prefix
     *
     * @optional - Specify this if you want a more specific path within the artifacts bucket.
     * @default No prefix
     */
    readonly s3BucketPrefix?: string;

    /**
     * Specify if the artifact bucket should be removed when canary is destroyed
     *
     * Available option is in cdk.RemovalPolicy
     *
     * @optional
     * @default cdk.RemovalPolicy.DESTROY
     */
    readonly removalPolicy?: RemovalPolicy;

    /**
     * The canary's bucket encryption key arn
     *
     * @optional - If a key arn is specified, the corresponding KMS key will be used to encrypt canary S3 bucket.
     * @default None - A new key is provisioned for the canary S3 bucket.
     */
    readonly s3BucketEncryptionKeyArn?: string;

    /** The canary log bucket
     *
     * @optional - All canary logs will be stored in the provided bucket.
     * @default None - A new bucket is provisioned for the canary.
     */
    readonly canaryLogBucket?: s3.IBucket;

    /** The number of days to retain data about failed runs of this canary
     *
     * @optional
     * @default None - If none of provided, cdk automatically applies the default value of 31 days.
     */
    readonly failureLogRetentionPeriod?: number;

    /** The number of days to retain data about successful runs of this canary
     *
     * @optional
     * @default None - If none of provided, cdk automatically applies the default value of 31 days.
     */
    readonly successLogRetentionPeriod?: number;
}

const canaryNameReg = /^[0-9a-z_-]+$/;

export class AWSSyntheticsCanary extends Construct {
    public readonly canaryRole: iam.Role;

    public constructor(scope: Construct, id: string, props: AWSSyntheticsCanaryProps) {
        super(scope, id);

        if (props.canaryName.length > 21) {
            throw new Error('Canary name must be less than 21 characters in length.');
        }

        if (!canaryNameReg.test(props.canaryName)) {
            throw new Error(`Invalid canary name, must match /^[0-9a-z_-]+$/`);
        }

        const removePolicy = props.removalPolicy ?? RemovalPolicy.DESTROY;

        // create canary artifacts bucket
        const artifactsBucket = props.canaryLogBucket
            ? props.canaryLogBucket
            : new AWSSecureBucket(this, 'CanaryArtifactBucket', {
                  autoDeleteObjects: removePolicy === RemovalPolicy.DESTROY,
                  removalPolicy: removePolicy,
                  encryptionKeyArn: props.s3BucketEncryptionKeyArn,
              }).bucket;

        const prefix = props.s3BucketPrefix || '';

        // create canary execution role
        this.canaryRole = new iam.Role(this, `CanaryExecutionRole`, {
            assumedBy: new iam.ServicePrincipal('lambda'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AWSLambdaBasicExecutionRole'
                ),
                // must to have this one for lambda to run in VPC
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AWSLambdaVPCAccessExecutionRole'
                ),
            ],
            inlinePolicies: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                CanaryPolicy: this.getCanaryRolePolicyDoc(artifactsBucket, prefix),
            },
            description: 'Execution Role for CloudWatch Synthetics Canary',
        });

        const scheduleExpressString =
            props.schedule?.expressionString ?? 'rate(5 minutes)';

        // create synthetics canary
        const canary = new synthetics.Canary(this, 'Canary', {
            artifactsBucketLocation: {
                bucket: artifactsBucket,
                prefix,
            },
            role: this.canaryRole,
            runtime: props.runtime,
            canaryName: props.canaryName,
            schedule: synthetics.Schedule.expression(scheduleExpressString),
            startAfterCreation: props.startAfterCreation ?? true,
            test: props.test,
            environmentVariables: props.environmentVariables,
            vpc: props.vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            failureRetentionPeriod: Duration.days(props.failureLogRetentionPeriod ?? 31),
            successRetentionPeriod: Duration.days(props.successLogRetentionPeriod ?? 31),
        });
        Aspects.of(canary).add(
            new CfnNagResourcePathEndingWithSuppressionAspect(
                '/Canary/SecurityGroup/Resource',
                [
                    {
                        id: 'W40',
                        reason: 'Security group is created by CDK and is egress only',
                    },
                    {
                        id: 'W5',
                        reason: 'Security group is created by CDK and is egress only',
                    },
                ]
            )
        );
    }

    private getCanaryRolePolicyDoc(
        artifactsBucket: s3.IBucket,
        prefix: string
    ): iam.PolicyDocument {
        const { partition } = Stack.of(this);
        const policy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    resources: ['arn:aws:s3:::*'],
                    actions: ['s3:ListAllMyBuckets'],
                }),
                new iam.PolicyStatement({
                    resources: [
                        artifactsBucket.arnForObjects(`${prefix ? prefix + '/*' : '*'}`),
                    ],
                    actions: ['s3:PutObject', 's3:GetBucketLocation'],
                }),
                new iam.PolicyStatement({
                    resources: [artifactsBucket.bucketArn],
                    actions: ['s3:GetBucketLocation'],
                }),
                new iam.PolicyStatement({
                    resources: ['*'],
                    actions: ['cloudwatch:PutMetricData'],
                    conditions: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        StringEquals: { 'cloudwatch:namespace': 'CloudWatchSynthetics' },
                    },
                }),
                new iam.PolicyStatement({
                    resources: ['*'],
                    actions: ['xray:PutTraceSegments'],
                }),
                new iam.PolicyStatement({
                    resources: [`arn:${partition}:logs:::*`],
                    actions: [
                        'logs:CreateLogStream',
                        'logs:CreateLogGroup',
                        'logs:PutLogEvents',
                    ],
                }),
            ],
        });
        return policy;
    }
}
