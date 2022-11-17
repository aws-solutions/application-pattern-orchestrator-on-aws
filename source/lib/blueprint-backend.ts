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

import * as path from 'path';
import { BlueprintInfrastructureSetup } from './blueprint-infrastructure-setup-construct';
import { BlueprintPortalService } from './blueprint-portal-service';
import { AWSSecureBucket } from './infra-utils/aws-secure-bucket';
import { Aspects, Duration, PhysicalName, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import * as envConfig from './blueprint-environment';
import * as lambdaEventSource from 'aws-cdk-lib/aws-lambda-event-sources';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import * as events from 'aws-cdk-lib/aws-events';
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
    AttributeType,
    BillingMode,
    ITable,
    Table,
    TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { AWSLambdaFunction } from './infra-utils/aws-lambda-function';
import {
    addCfnNagSuppression,
    CfnNagResourcePathEndingWithSuppressionAspect,
} from './cfn-nag-suppression';
import { LogLevelType, PatternType, WafInfo } from './blueprint-types';
import { NagSuppressions } from 'cdk-nag';

export interface BlueprintBackendProps {
    readonly vpc: IVpc;
    readonly cognitoUserPoolArn: string;
    readonly solutionId: string;
    readonly solutionTradeMarkName: string;
    readonly solutionName: string;
    readonly solutionVersion: string;
    readonly anonymousDataUUID: string;
    readonly customUserAgent: string;
    readonly githubTokenSecretId: string;
    readonly githubConnectionArnSsmParam: string;
    readonly githubUrl: string;
    readonly githubOrganization: string;
    readonly codeOwners?: string;
    readonly proxiUri?: string;
    readonly patternType: PatternType;
    readonly patternEmailTable: ITable;
    readonly wafInfo?: WafInfo;
    readonly removalPolicy: RemovalPolicy;
    readonly logLevel: LogLevelType;
}

const serviceCatalogPolicy = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
        'servicecatalog:CreateAttributeGroup',
        'servicecatalog:GetAttributeGroup',
        'servicecatalog:UpdateAttributeGroup',
        'servicecatalog:DeleteAttributeGroup',
        'servicecatalog:TagResource',
        'servicecatalog:UntagResource',
    ],
    resources: ['*'],
});

export class BlueprintBackend extends Construct {
    private readonly kmsKeys: Record<string, IKey>;
    private appRegistryUpdateQueue: Queue;
    public readonly blueprintInfrastructureSetup: BlueprintInfrastructureSetup;
    public readonly blueprintPortalService: BlueprintPortalService;
    public readonly rapmMetaDataTable: ITable;
    public readonly rapmPublishDataTable: ITable;
    public readonly rapmAttributesTable: ITable;

    public constructor(scope: Construct, id: string, props: BlueprintBackendProps) {
        super(scope, id);

        this.kmsKeys = this.setupCMKs(props.removalPolicy);

        const vpc = props.vpc;

        // dynamodb tables common properties
        const { rapmMetaDataTable, rapmPublishDataTable, rapmAttributesTable } =
            this.setupDynamoDbTables(props.removalPolicy);
        // setup AppRegistry updater resources
        const [appRegistryUpdatedLambda] = this.setupAppRegistryUpdater(
            props.vpc,
            rapmAttributesTable.tableName,
            props.removalPolicy,
            props.logLevel
        );

        this.appRegistryCfnNagSuppressions(appRegistryUpdatedLambda);
        rapmAttributesTable.grantReadWriteData(appRegistryUpdatedLambda.lambdaFunction);
        // setup timedSynchronisor to keep attributes in DynamoDb in sync with AppRegistry
        const timedSynchroniserLambda = this.setupTimedSynchronizor(
            props.vpc,
            rapmAttributesTable.tableName,
            props.logLevel
        );
        this.timedSynchCfnNagSupressions(timedSynchroniserLambda);
        rapmAttributesTable.grantReadWriteData(timedSynchroniserLambda.lambdaFunction);

        const blueprintArtifactsBucket = new AWSSecureBucket(
            this,
            'BlueprintArtifactsBucket',
            {
                bucketName: PhysicalName.GENERATE_IF_NEEDED,
                removalPolicy: props.removalPolicy,
                autoDeleteObjects: props.removalPolicy === RemovalPolicy.DESTROY,
                encryptionKeyArn: this.kmsKeys.blueprintBucket.keyArn,
            }
        );

        this.blueprintInfrastructureSetup = new BlueprintInfrastructureSetup(
            this,
            'BlueprintInfrastructureSetup',
            {
                rapmMetaDataTable,
                rapmPublishDataTable,
                rapmAttributesTable,
                blueprintArtifactsBucket: blueprintArtifactsBucket.bucket,
                s3encryptionKey: this.kmsKeys.blueprintBucket,
                secretsManagerEncryptionKey: this.kmsKeys.blueprintSecretsManager,
                blueprintsnsEncryptionKey: this.kmsKeys.blueprintsnsEncryptionKey,
                rapmMetaDataTableEncryptionKey:
                    this.kmsKeys.rapmMetaDataTableEncryptionKey,
                customUserAgent: props.customUserAgent,
                vpc,
                githubUrl: props.githubUrl,
                githubTokenSecretId: props.githubTokenSecretId,
                githubConnectionArnSsmParam: props.githubConnectionArnSsmParam,
                patternType: props.patternType,
                solutionName: props.solutionName,
                solutionTradeMarkName: props.solutionTradeMarkName,
                removalPolicy: props.removalPolicy,
                logLevel: props.logLevel,
            }
        );

        this.blueprintPortalService = new BlueprintPortalService(this, id, {
            rapmMetaDataTable,
            rapmPublishDataTable,
            rapmAttributesTable,
            appRegistryUpdateQueue: this.appRegistryUpdateQueue,
            blueprintCodeBuildProjectName:
                this.blueprintInfrastructureSetup.updateBlueprintInfrastructureProject
                    .projectName,
            s3encryptionKey: this.kmsKeys.blueprintBucket,
            lambdaEncryptionKey: this.kmsKeys.blueprintLambdaEncryptionKey,
            blueprintArtifactsBucket: blueprintArtifactsBucket.bucket,
            vpc,
            cognitoUserPoolArn: props.cognitoUserPoolArn,
            anonymousDataUUID: props.anonymousDataUUID,
            solutionId: props.solutionId,
            solutionVersion: props.solutionVersion,
            customUserAgent: props.customUserAgent,
            githubTokenSecretId: props.githubTokenSecretId,
            githubUrl: props.githubUrl,
            githubOrganization: props.githubOrganization,
            codeOwners: props.codeOwners,
            proxiUri: props.proxiUri,
            patternEmailTable: props.patternEmailTable,
            wafInfo: props.wafInfo,
            removalPolicy: props.removalPolicy,
            logLevel: props.logLevel,
        });
        this.rapmAttributesTable = rapmAttributesTable;
        this.rapmMetaDataTable = rapmMetaDataTable;
        this.rapmPublishDataTable = rapmPublishDataTable;
    }

    private timedSynchCfnNagSupressions(
        timedSynchroniserLambda: AWSLambdaFunction
    ): void {
        Aspects.of(timedSynchroniserLambda).add(
            new CfnNagResourcePathEndingWithSuppressionAspect(
                '/LambdaFunction/SecurityGroup/Resource',
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
        addCfnNagSuppression(
            timedSynchroniserLambda.lambdaExecutionRole,
            [
                {
                    id: 'W12',
                    reason: 'The policy is generated by CDK. Also servicecatalog permissions needs to use *',
                },
                {
                    id: 'W76',
                    reason: 'Permissions are added by CDK. Only servicecatalog permissions are added from code',
                },
            ],
            'DefaultPolicy'
        );
        addCfnNagSuppression(
            timedSynchroniserLambda,
            [
                {
                    id: 'W11',
                    reason: 'The policy is generated by CDK. Also servicecatalog permissions needs to use *',
                },
            ],
            'ExecutionRole'
        );
        addCfnNagSuppression(timedSynchroniserLambda.lambdaFunction, [
            {
                id: 'W58',
                reason: 'The permission to write to CloudWatch Logs already exists',
            },
            {
                id: 'W92',
                reason: 'Some new AWS accounts have very low limit for concurrency causing deployment to fail',
            },
        ]);
    }

    private appRegistryCfnNagSuppressions(
        appRegistryUpdatedLambda: AWSLambdaFunction
    ): void {
        addCfnNagSuppression(
            appRegistryUpdatedLambda.lambdaExecutionRole,
            [
                {
                    id: 'W12',
                    reason: 'The policy is generated by CDK. Also servicecatalog permissions needs to use *',
                },
                {
                    id: 'W76',
                    reason: 'Permissions are added by CDK. Only servicecatalog permissions are added from code',
                },
            ],
            'DefaultPolicy'
        );
        Aspects.of(appRegistryUpdatedLambda).add(
            new CfnNagResourcePathEndingWithSuppressionAspect(
                '/appRegistryUpdater/LambdaFunction/SecurityGroup/Resource',
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
        addCfnNagSuppression(appRegistryUpdatedLambda.lambdaExecutionRole, [
            {
                id: 'W11',
                reason: 'The policy is generated by CDK. Also servicecatalog permissions needs to use *',
            },
        ]);
        addCfnNagSuppression(appRegistryUpdatedLambda.lambdaFunction, [
            {
                id: 'W58',
                reason: 'The permission to write to CloudWatch Logs already exists',
            },
            {
                id: 'W92',
                reason: 'Some new AWS accounts have very low limit for concurrency causing deployment to fail',
            },
        ]);
    }

    private setupAppRegistryUpdater(
        vpc: IVpc,
        attributeTableName: string,
        removalPolicy: RemovalPolicy,
        logLevel: LogLevelType
    ): [AWSLambdaFunction, string] {
        // Dead Letter Queue for failed updating messages
        const deadLetterQueue = new Queue(this, 'RapmAppRegistryPendingUpdateDLQ', {
            queueName: `RapmAppRegistryPendingUpdateDLQ.fifo`,
            fifo: true,
            encryption: QueueEncryption.KMS,
            encryptionMasterKey: this.kmsKeys.rapmAttributesTableEncryptionKey,
            removalPolicy,
        });
        NagSuppressions.addResourceSuppressions(deadLetterQueue, [
            {
                id: 'AwsSolutions-SQS3',
                reason: 'It is a dead letter queue configured for lambda',
            },
            {
                id: 'AwsSolutions-SQS4',
                reason: 'It is a dead letter queue configured for lambda',
            },
        ]);

        // Pending update queue for AppRegistry updater lambda
        this.appRegistryUpdateQueue = new Queue(this, 'AppRegistryPendingUpdateQueue', {
            queueName: `RapmAppRegistryPendingUpdateQueue.fifo`,
            fifo: true,
            contentBasedDeduplication: true,
            retentionPeriod: Duration.hours(23),
            visibilityTimeout: Duration.seconds(60),
            deadLetterQueue: {
                queue: deadLetterQueue,
                maxReceiveCount: 1,
            },
            encryption: QueueEncryption.KMS,
            encryptionMasterKey: this.kmsKeys.rapmAttributesTableEncryptionKey,
            removalPolicy,
            enforceSSL: true,
        });

        const lambdaEnvironmentVariables = {
            [envConfig.environmentVariables.RAPM_ATTRIBUTES_TABLE_NAME]:
                attributeTableName,
            [envConfig.environmentVariables.LOG_LEVEL]: logLevel,
        };

        const appRegistryUpdaterLambda = new AWSLambdaFunction(
            this,
            'appRegistryUpdater',
            {
                name: 'RapmAppRegistryUpdater',
                handler: 'appRegistryUpdater.lambdaHandler',
                code: Code.fromAsset(
                    path.resolve(
                        __dirname,
                        `../lambda/blueprintgovernanceservice/dist/appRegistryUpdater`
                    )
                ),
                description: `RAPM AppRegistry Updater lambda function`,
                timeout: Duration.seconds(45),
                runtime: Runtime.NODEJS_14_X,
                memorySize: 1024,
                initialPolicy: [serviceCatalogPolicy],
                vpc,
                environment: lambdaEnvironmentVariables,
            }
        );

        NagSuppressions.addResourceSuppressions(
            appRegistryUpdaterLambda.lambdaExecutionRole,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'This is for DescribeNetworkInterfaces permission',
                },
            ],
            true
        );
        NagSuppressions.addResourceSuppressions(
            appRegistryUpdaterLambda,
            [
                {
                    id: 'AwsSolutions-L1',
                    reason: 'Node 14 is still supported version and solution relies on this version.',
                },
            ],
            true
        );
        // link update Queue to lambda
        appRegistryUpdaterLambda.lambdaFunction.addEventSource(
            new lambdaEventSource.SqsEventSource(this.appRegistryUpdateQueue)
        );

        return [appRegistryUpdaterLambda, deadLetterQueue.queueName];
    }

    private setupTimedSynchronizor(
        vpc: IVpc,
        attributesTableName: string,
        logLevel: LogLevelType
    ): AWSLambdaFunction {
        const lambdaEnvironmentVariables = {
            [envConfig.environmentVariables.APPREGISTRY_UPDATER_QUEUE_URL]:
                this.appRegistryUpdateQueue.queueUrl,

            [envConfig.environmentVariables.RAPM_ATTRIBUTES_TABLE_NAME]:
                attributesTableName,

            [envConfig.environmentVariables.LOG_LEVEL]: logLevel,
        };
        const timedSynchroniserLambda = new AWSLambdaFunction(this, 'timedSynchroniser', {
            name: 'RapmTimedSynchroniser',
            description: `RAPM Timed Synrchroniser lambda function`,
            runtime: Runtime.NODEJS_14_X,
            handler: 'timedSynchroniser.lambdaHandler',
            code: Code.fromAsset(
                path.resolve(
                    __dirname,
                    `../lambda/blueprintgovernanceservice/dist/timedSynchroniser`
                )
            ),
            memorySize: 1024,
            initialPolicy: [serviceCatalogPolicy],
            timeout: Duration.minutes(15),
            environment: lambdaEnvironmentVariables,
            vpc,
        });

        NagSuppressions.addResourceSuppressions(
            timedSynchroniserLambda.lambdaExecutionRole,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'This is for DescribeNetworkInterfaces permission',
                },
            ],
            true
        );
        NagSuppressions.addResourceSuppressions(
            timedSynchroniserLambda,
            [
                {
                    id: 'AwsSolutions-L1',
                    reason: 'Node 14 is still supported version and solution relies on this version.',
                },
            ],
            true
        );

        this.appRegistryUpdateQueue.grantSendMessages(
            timedSynchroniserLambda.lambdaFunction
        );

        const scheduleExpression =
            this.node.tryGetContext('appRegistrySyncScheduleExpression') ||
            'rate(12 hours)';

        new events.Rule(this, 'AppRegistrySyncTimerRule', {
            schedule: events.Schedule.expression(scheduleExpression),
            targets: [
                new targets.LambdaFunction(timedSynchroniserLambda.lambdaFunction, {
                    maxEventAge: Duration.hours(1),
                    retryAttempts: 0,
                }),
            ],
        });
        return timedSynchroniserLambda;
    }

    private setupDynamoDbTables(removalPolicy: RemovalPolicy): Record<string, Table> {
        const commonDBTableParams = {
            encryption: TableEncryption.CUSTOMER_MANAGED,
            pointInTimeRecovery: true,
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy,
        };

        // attributes table
        const rapmAttributesTable = new Table(this, 'rapmAttributesTable', {
            ...commonDBTableParams,
            partitionKey: { name: 'id', type: AttributeType.STRING },
            encryptionKey: this.kmsKeys.rapmAttributesTableEncryptionKey,
        });
        addCfnNagSuppression(rapmAttributesTable, [
            {
                id: 'W28',
                reason: 'The DynamoDb table is referenced in multiple stacks so need a fixed name.',
            },
        ]);

        // pattern metadata table
        const rapmMetaDataTable = new Table(this, 'rapmMetaDataTable', {
            ...commonDBTableParams,
            partitionKey: {
                name: 'patternId',
                type: AttributeType.STRING,
            },
            encryptionKey: this.kmsKeys.rapmMetaDataTableEncryptionKey,
        });
        addCfnNagSuppression(rapmMetaDataTable, [
            {
                id: 'W28',
                reason: 'The DynamoDb table is referenced in multiple stacks so need a fixed name.',
            },
        ]);
        // pattern publish data table
        const rapmPublishDataTable = new Table(this, 'rapmPublishDataTable', {
            ...commonDBTableParams,
            partitionKey: {
                name: 'patternId',
                type: AttributeType.STRING,
            },
            sortKey: {
                name: 'commitId',
                type: AttributeType.STRING,
            },
            encryptionKey: this.kmsKeys.rapmPublishDataTableEncryptionKey,
        });
        addCfnNagSuppression(rapmPublishDataTable, [
            {
                id: 'W28',
                reason: 'The DynamoDb table is referenced in multiple stacks so need a fixed name.',
            },
        ]);
        return { rapmMetaDataTable, rapmPublishDataTable, rapmAttributesTable };
    }

    private setupCMKs(removalPolicy: RemovalPolicy): Record<string, IKey> {
        const kmsKeys = {
            blueprintBucket: this.createCMK('blueprintBucket', removalPolicy),
            blueprintSecretsManager: this.createCMK(
                'blueprintSecretsManager',
                removalPolicy
            ),
            rapmMetaDataTableEncryptionKey: this.createCMK(
                'rapmMetaDataTableEncryptionKey',
                removalPolicy
            ),
            rapmPublishDataTableEncryptionKey: this.createCMK(
                'rapmPublishDataTableEncryptionKey',
                removalPolicy
            ),
            rapmAttributesTableEncryptionKey: this.createCMK(
                'rapmAttributesTableEncryptionKey',
                removalPolicy
            ),
            blueprintsnsEncryptionKey: this.createCMK(
                'blueprintsnsEncryptionKey',
                removalPolicy
            ),
            blueprintLambdaEncryptionKey: this.createCMK(
                'blueprintLambdaEncryptionKey',
                removalPolicy
            ),
        };
        return kmsKeys;
    }

    private createCMK(name: string, removalPolicy: RemovalPolicy): Key {
        return new Key(this, `CMKKey${name}`, {
            description: `KMS Key for app-pattern/${name}`,
            alias: `ApplicationPattern-${name}`,
            enableKeyRotation: true,
            removalPolicy,
        });
    }
}
