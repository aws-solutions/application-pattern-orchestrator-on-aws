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
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodeJsLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as eventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Aspects, RemovalPolicy } from 'aws-cdk-lib';
import {
    addCfnNagSuppression,
    CfnNagResourcePathEndingWithSuppressionAspect,
} from './cfn-nag-suppression';
import { NagSuppressions } from 'cdk-nag';
import { LogLevelType } from './blueprint-types';

export interface BlueprintNotificationProps {
    email: string;
    vpc: ec2.IVpc;
    logLevel: LogLevelType;
    topic: sns.ITopic;
    removalPolicy?: RemovalPolicy;
    patternEmailTable: ddb.ITable;
}

export class BlueprintNotification extends Construct {
    public readonly emailSenderFn: lambda.IFunction;

    public constructor(scope: Construct, id: string, props: BlueprintNotificationProps) {
        super(scope, id);

        new ses.EmailIdentity(this, 'rapm-email-identity', {
            identity: ses.Identity.email(props.email),
        });

        const emailTemplate = new ses.CfnTemplate(
            this,
            'pattern-updated-email-template',
            {
                template: {
                    subjectPart:
                        'AWS application pattern {{patternName}} is available to use',
                    htmlPart: `
                <p>
                    Hi,
                </p>
                <p>
                    This is an automatically generated notification from Application Pattern Orchestrator on AWS that a new version of AWS application pattern {{patternName}} is approved and now available for use.
                </p>

                <h1>Pattern Description</h1>
                {{patternDescription}}

                <h1>Pattern Attributes</h1>
                {{patternAttributes}}

                Click <a href="{{patternUri}}">here</a> to be directly taken to the pattern artifacts page via the solution UI.

                <h1>Details of change</h1>
                <ul>
                    <li>Commit message: {{commitMessage}}</li>
                    <li>Commit Id: {{commitId}}</li>
                    <li>Source repository: {{sourceRepo}}</li>
                </ul>

                <h1>Modified Packages</h1>
                {{modifiedPackages}}

                <h1>Published Pattern Destination</h1>
                Please refer to <a href="https://docs.aws.amazon.com/solutions/latest/aws-governed-application-pattern/welcome.html">the solution implementation guide</a> for instructions on how to use the pattern using the information below:
                {{patternDestination}}
                `,
                },
            }
        );

        const dlq = new sqs.Queue(this, 'email-sender-dlq', {
            removalPolicy: props.removalPolicy,
            encryptionMasterKey: new kms.Key(this, 'pattern-email-dlq-cmk', {
                removalPolicy: props.removalPolicy,
                description: 'KMS Key for app-pattern/pattern-email-dlq',
                alias: 'ApplicationPattern-pattern-email-dlq',
                enableKeyRotation: true,
            }),
        });
        NagSuppressions.addResourceSuppressions(
            dlq,
            [
                {
                    id: 'AwsSolutions-SQS3',
                    reason: 'It is a dead letter queue configured for lambda.',
                },
                {
                    id: 'AwsSolutions-SQS4',
                    reason: 'It is a dead letter queue configured for lambda.',
                },
            ],
            true
        );

        this.emailSenderFn = new nodeJsLambda.NodejsFunction(this, 'email-sender-fn', {
            description: 'Sends RAPM pattern lifecycle event notifications',
            entry: path.join(
                __dirname,
                '../lambda/blueprintgovernanceservice/src/email-sender/index.ts'
            ),
            handler: 'handler',
            vpc: props.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            logRetention: logs.RetentionDays.ONE_WEEK,
            runtime: lambda.Runtime.NODEJS_14_X,
            environment: {
                /* eslint-disable @typescript-eslint/naming-convention */
                MAPPING_TABLE: props.patternEmailTable.tableName,
                TEMPLATE_NAME: emailTemplate.attrId,
                LOG_LEVEL: props.logLevel,
                /* eslint-enable @typescript-eslint/naming-convention */
            },
            events: [new eventSources.SnsEventSource(props.topic, {})],
            initialPolicy: [
                new iam.PolicyStatement({
                    actions: [
                        'ses:ListVerifiedEmailAddresses',
                        'ses:SendEmail',
                        'ses:SendRawEmail',
                        'ses:SendTemplatedEmail',
                    ],
                    resources: ['*'], // wildcard required for ListVerifiedEmailAddresses
                }),
            ],
            deadLetterQueue: dlq,
        });
        NagSuppressions.addResourceSuppressions(
            this.emailSenderFn,
            [
                {
                    id: 'AwsSolutions-IAM4',
                    reason: 'Used managed policy AWSLambdaBasicExecutionRole and AWSLambdaVPCAccessExecutionRole',
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Need to use * for sending emails using AWS SES',
                },
                {
                    id: 'AwsSolutions-L1',
                    reason: 'Node 14 is still supported version and solution relies on this version.',
                },
            ],
            true
        );

        props.patternEmailTable.grantReadData(this.emailSenderFn);

        addCfnNagSuppression(this.emailSenderFn, [
            {
                id: 'W58',
                reason: 'The permission to write to CloudWatch Logs already exists',
            },
            {
                id: 'W92',
                reason: 'Some new AWS accounts have very low limit for concurrency causing deployment to fail',
            },
        ]);

        Aspects.of(this.emailSenderFn).add(
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
    }
}
