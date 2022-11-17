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
import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';
import { CustomResource, Aspects } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import {
    addCfnNagSuppression,
    CfnNagResourcePathEndingWithSuppressionAspect,
} from './cfn-nag-suppression';
import { LogLevelType, PatternType } from './blueprint-types';
import { NagSuppressions } from 'cdk-nag';

export interface OperationalMetricsCollectionProps {
    awsSolutionId: string;
    awsSolutionVersion: string;
    sendAnonymousData: string;
    retainData: string;
    vpc: IVpc;
    vpcsubnet: SubnetSelection;
    patternType: PatternType;
    logLevel: LogLevelType;
}

export class OperationalMetricsCollection extends Construct {
    public readonly anonymousDataUUID: string;
    public readonly sendAnonymousData: string;

    public constructor(
        scope: Construct,
        id: string,
        props: OperationalMetricsCollectionProps
    ) {
        super(scope, id);

        const lambda = new NodejsFunction(this, 'operational-metrics-handler', {
            entry: path.join(
                __dirname,
                '../lambda/blueprintgovernanceservice/src/metrics/OperationalMetricHandler.ts'
            ),
            handler: 'handler',
            description: 'Lambda for Operational Metrics collection',
            vpc: props.vpc,
            vpcSubnets: props.vpcsubnet,
            environment: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                LOG_LEVEL: props.logLevel,
            },
        });
        NagSuppressions.addResourceSuppressions(
            lambda,
            [
                {
                    id: 'AwsSolutions-IAM4',
                    reason: 'Uses service role - AWSLambdaVPCAccessExecutionRole and AWSLambdaBasicExecutionRole',
                },
                {
                    id: 'AwsSolutions-L1',
                    reason: 'Node 14 is still supported version and solution relies on this version.',
                },
            ],
            true
        );

        addCfnNagSuppression(lambda, [
            {
                id: 'W58',
                reason: 'Lambda already has the required permission to write CloudWatch Logs via arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole.',
            },
            {
                id: 'W92',
                reason: 'Some new AWS accounts have very low limit for concurrency causing deployment to fail',
            },
        ]);
        Aspects.of(lambda).add(
            new CfnNagResourcePathEndingWithSuppressionAspect('/SecurityGroup/Resource', [
                {
                    id: 'W40',
                    reason: 'Security group is created by CDK and is egress only',
                },
                {
                    id: 'W5',
                    reason: 'Security group is created by CDK and is egress only',
                },
            ])
        );

        const provider = new cr.Provider(this, 'Provider', {
            onEventHandler: lambda,
        });

        NagSuppressions.addResourceSuppressions(
            provider,
            [
                {
                    id: 'AwsSolutions-IAM4',
                    reason: 'Uses service role - AWSLambdaVPCAccessExecutionRole and AWSLambdaBasicExecutionRole',
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Wildcard permission is autogenerated by CDK',
                },
                {
                    id: 'AwsSolutions-L1',
                    reason: 'Node 14 is still supported version and solution relies on this version.',
                },
            ],
            true
        );

        const {
            awsSolutionId,
            awsSolutionVersion,
            sendAnonymousData,
            retainData,
            patternType,
        } = props;
        const customResource = new CustomResource(
            this,
            'operational-metrics-custom-resource',
            {
                serviceToken: provider.serviceToken,
                properties: {
                    awsSolutionId,
                    awsSolutionVersion,
                    awsRegion: cdk.Aws.REGION,
                    sendAnonymousData,
                    retainData,
                    patternType,
                },
            }
        );

        this.anonymousDataUUID = customResource.getAttString('anonymousDataUUID');
    }
}
