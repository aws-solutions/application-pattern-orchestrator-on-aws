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
import {
    Aspects,
    aws_lambda_event_sources,
    aws_lambda_nodejs,
    Duration,
    RemovalPolicy,
    Stack,
} from 'aws-cdk-lib';
import { CfnDomain, CfnRepository } from 'aws-cdk-lib/aws-codeartifact';
import { BuildSpec, LinuxBuildImage, Project, Source } from 'aws-cdk-lib/aws-codebuild';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IVpc, SecurityGroup, SubnetType } from 'aws-cdk-lib/aws-ec2';
import {
    Effect,
    PolicyStatement,
    Role,
    ServicePrincipal,
    AnyPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import {
    BlockPublicAccess,
    Bucket,
    BucketAccessControl,
    BucketEncryption,
    IBucket,
} from 'aws-cdk-lib/aws-s3';
import { BucketDeployment } from 'aws-cdk-lib/aws-s3-deployment';
import * as s3Source from 'aws-cdk-lib/aws-s3-deployment';
import { CfnPortfolio } from 'aws-cdk-lib/aws-servicecatalog';
import { Topic, ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import * as path from 'path';
import { RAPM_CONSTANTS } from './constants';
import {
    addCfnNagSuppression,
    CfnNagResourcePathEndingWithSuppressionAspect,
} from './cfn-nag-suppression';
import { LogLevelType, PatternType } from './blueprint-types';
import { NagSuppressions } from 'cdk-nag';

export interface BlueprintInfrastructureSetupProps {
    rapmMetaDataTable: ITable;
    rapmPublishDataTable: ITable;
    rapmAttributesTable: ITable;
    blueprintArtifactsBucket: IBucket;
    blueprintsnsEncryptionKey: IKey;
    rapmMetaDataTableEncryptionKey: IKey;
    s3encryptionKey: IKey;
    secretsManagerEncryptionKey: IKey;
    customUserAgent: string;
    vpc: IVpc;
    githubUrl: string;
    githubTokenSecretId: string;
    githubConnectionArnSsmParam: string;
    patternType: PatternType;
    solutionName: string;
    solutionTradeMarkName: string;
    removalPolicy: RemovalPolicy;
    logLevel: LogLevelType;
}

export class BlueprintInfrastructureSetup extends Construct {
    public updateBlueprintInfrastructureProject: Project;
    public readonly blueprintGovernanceNotificationTopic: ITopic;

    /**
     * Create the codebuild project that deploys a new blueprint infrastructure
     * @param scope
     * @param id
     * @param props
     */
    public constructor(
        scope: Construct,
        id: string,
        props: BlueprintInfrastructureSetupProps
    ) {
        super(scope, id);

        const proxyUri = this.node.tryGetContext('proxyUri');

        const serviceCatalogPortfolio = new CfnPortfolio(this, 'BlueprintPortfolio', {
            displayName: 'PatternsPortfolio',
            providerName: 'RAPM',
            description: 'RAPM Portfolio for patterns',
        });

        // Code artifact repository where blueprint cdk construct are published
        const codeArtifactDomain = new CfnDomain(this, 'CodeArtifactDomain', {
            domainName: RAPM_CONSTANTS.RAPM_CODE_ARTIFACT_DOMAIN_NAME,
        });

        const codeArtifactRepository = new CfnRepository(this, 'CodeArtifactRepository', {
            domainName: RAPM_CONSTANTS.RAPM_CODE_ARTIFACT_DOMAIN_NAME,
            repositoryName: RAPM_CONSTANTS.RAPM_CODE_ARTIFACT_REPOSITORY_NAME,
        });

        codeArtifactRepository.node.addDependency(codeArtifactDomain);

        // SNS topic for pattern publishing events
        this.blueprintGovernanceNotificationTopic = new Topic(
            this,
            'BlueprintGovernanceNotificationTopic',
            { masterKey: props.blueprintsnsEncryptionKey }
        );

        // SNS topic that CloudFormation will notify with blueprint infrastructure stack related events
        const blueprintInfrastructureNotificationTopic = new Topic(
            this,
            'BlueprintInfrastructureNotificationTopic',
            { masterKey: props.blueprintsnsEncryptionKey }
        );

        // Copy blueprint infrastructure CDK code to a static bucket
        const blueprintInfrastructureBucket = new Bucket(
            this,
            'BlueprintInfrastructureBucket',
            {
                versioned: true,
                blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
                encryption: BucketEncryption.KMS_MANAGED,
                accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
                serverAccessLogsPrefix: 'access-log',
                autoDeleteObjects: props.removalPolicy === RemovalPolicy.DESTROY,
                removalPolicy: props.removalPolicy,
            }
        );
        blueprintInfrastructureBucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'HttpsOnly',
                resources: [`${blueprintInfrastructureBucket.bucketArn}/*`],
                actions: ['*'],
                principals: [new AnyPrincipal()],
                effect: Effect.DENY,
                conditions: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    Bool: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        'aws:SecureTransport': 'false',
                    },
                },
            })
        );
        NagSuppressions.addResourceSuppressions(
            blueprintInfrastructureBucket,
            [
                {
                    id: 'AwsSolutions-S10',
                    reason: 'This is false positive. Bucket policy has condition to block Non Https traffic',
                },
            ],
            true
        );

        const blueprintInfrastructureArchiveName = 'blueprint-infrastructure.zip';

        new BucketDeployment(this, 'Assets', {
            sources: [
                s3Source.Source.asset(
                    path.join(__dirname, '..', 'blueprint-infrastructure-asset')
                ),
            ],
            destinationBucket: blueprintInfrastructureBucket,
        });

        const updateBlueprintInfrastructureProjectRole = new Role(
            this,
            'UpdateBlueprintInfrastructureProjectRole',
            {
                assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
            }
        );
        Aspects.of(updateBlueprintInfrastructureProjectRole).add(
            new CfnNagResourcePathEndingWithSuppressionAspect(
                '/UpdateBlueprintInfrastructureProjectRole/DefaultPolicy/Resource',
                [
                    {
                        id: 'W76',
                        reason: 'The policy is implicitly generated by CDK.',
                    },
                ]
            )
        );

        const blueprintInfrastructureSecurityGroup = new SecurityGroup(
            this,
            'BlueprintInfrastructureSecurityGroup',
            {
                vpc: props.vpc,
                allowAllOutbound: true,
                description: 'default security group for lambdas and codebuilds',
            }
        );
        addCfnNagSuppression(blueprintInfrastructureSecurityGroup, [
            {
                id: 'W40',
                reason: 'default security group for lambdas and codebuilds',
            },
            {
                id: 'W5',
                reason: 'default security group for lambdas and codebuilds',
            },
        ]);

        const updateBlueprintInfrastructureProjectName = 'UpdateBlueprintInfrastructure';

        const blueprintInfrastructureSharedConfig = {
            vpcId: props.vpc.vpcId,
            githubUrl: props.githubUrl,
            blueprintInfrastructureBucketName: blueprintInfrastructureBucket.bucketName,
            blueprintInfrastructureArchiveName: blueprintInfrastructureArchiveName,
            rapmMetaDataTable: props.rapmMetaDataTable.tableName,
            rapmPublishDataTable: props.rapmPublishDataTable.tableName,
            rapmAttributesTable: props.rapmAttributesTable.tableName,
            rapmMetaDataTableEncryptionKey: props.rapmMetaDataTable.encryptionKey?.keyArn,
            rapmPublishDataTableEncryptionKey:
                props.rapmPublishDataTable.encryptionKey?.keyArn,
            rapmAttributesTableEncryptionKey:
                props.rapmAttributesTable.encryptionKey?.keyArn,
            blueprintArtifactsBucketName: props.blueprintArtifactsBucket.bucketName,
            blueprintArtifactsBucketEncryptionKeyArn:
                props.blueprintArtifactsBucket.encryptionKey?.keyArn,
            blueprintInfrastructureNotifTopicArn:
                blueprintInfrastructureNotificationTopic.topicArn,
            blueprintGovernanceNotificationTopicArn:
                this.blueprintGovernanceNotificationTopic.topicArn,
            blueprintSnsEncryptionKeyArn: props.blueprintsnsEncryptionKey.keyArn,
            s3BucketEncryptionKeyArn: props.s3encryptionKey.keyArn,
            secretsManagerEncryptionKeyArn: props.secretsManagerEncryptionKey.keyArn,
            codeArtifactDomainName: RAPM_CONSTANTS.RAPM_CODE_ARTIFACT_DOMAIN_NAME,
            codeArtifactRepositoryName: RAPM_CONSTANTS.RAPM_CODE_ARTIFACT_REPOSITORY_NAME,
            githubTokenSecretId: props.githubTokenSecretId,
            blueprintServiceCatalogPortfolioId: serviceCatalogPortfolio.ref,
            customUserAgent: props.customUserAgent,
            proxyUri: proxyUri ?? '',
            updateBlueprintInfrastructureProjectName:
                updateBlueprintInfrastructureProjectName,
            updateBlueprintInfrastructureProjectRoleArn:
                updateBlueprintInfrastructureProjectRole.roleArn,
            blueprintInfrastructureSecurityGroupId:
                blueprintInfrastructureSecurityGroup.securityGroupId,
            solutionName: props.solutionName,
            solutionTradeMarkName: props.solutionTradeMarkName,
            logLevel: props.logLevel,
        };

        this.updateBlueprintInfrastructureProject = new Project(
            this,
            'UpdateBlueprintInfrastructureProject',
            {
                projectName: updateBlueprintInfrastructureProjectName,
                source: Source.s3({
                    bucket: blueprintInfrastructureBucket,
                    path: blueprintInfrastructureArchiveName,
                }),
                role: updateBlueprintInfrastructureProjectRole,
                environment: {
                    buildImage: LinuxBuildImage.STANDARD_5_0,
                },
                vpc: props.vpc,
                subnetSelection: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                    onePerAz: true,
                },
                environmentVariables: {
                    // The following variables are defined at build start time
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    BLUEPRINT_ID: { value: '' },
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    BLUEPRINT_TYPE: { value: '' },
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    GITHUB_REPOSITORY_OWNER: { value: '' },
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    GITHUB_REPOSITORY_NAME: { value: '' },
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    GITHUB_REPOSITORY_MAIN_BRANCH_NAME: { value: '' },
                },
                buildSpec: BuildSpec.fromObject(
                    this.generateUpdateBlueprintInfrastructureBuildSpec(
                        proxyUri,
                        blueprintInfrastructureSharedConfig,
                        blueprintInfrastructureNotificationTopic,
                        props.githubConnectionArnSsmParam
                    )
                ),
            }
        );
        NagSuppressions.addResourceSuppressions(
            this.updateBlueprintInfrastructureProject,
            [
                {
                    id: 'AwsSolutions-CB4',
                    reason: 'This is false positive. CodeBuild is KMS encrypted.',
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Add permission to all the pattern publishing keys via alias name. This is to prevent exceeding the policy size limit',
                },
            ],
            true
        );
        this.updateBlueprintInfraProjectCfnNagSuppressions();

        // Permissions to deploy cdk stack using "newStyleStackSynthesis"
        // cf https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html#bootstrapping-synthesizers
        updateBlueprintInfrastructureProjectRole.addToPrincipalPolicy(
            new PolicyStatement({
                actions: ['sts:AssumeRole'],
                resources: [
                    `arn:aws:iam::${
                        Stack.of(this).account
                    }:role/cdk-*-file-publishing-role-${Stack.of(this).account}-${
                        Stack.of(this).region
                    }`,
                    `arn:aws:iam::${Stack.of(this).account}:role/cdk-*-deploy-role-${
                        Stack.of(this).account
                    }-${Stack.of(this).region}`,
                    `arn:aws:iam::${Stack.of(this).account}:role/cdk-*-lookup-role-${
                        Stack.of(this).account
                    }-${Stack.of(this).region}`,
                ],
            })
        );
        // Add permission to all the pattern publishing keys via alias name
        // This is to prevent exceeding the policy size limit
        updateBlueprintInfrastructureProjectRole.addToPrincipalPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['kms:Decrypt', 'kms:DescribeKey', 'kms:GenerateDataKey*'],
                resources: [
                    `arn:aws:kms:${Stack.of(this).region}:${
                        Stack.of(this).account
                    }:key/*`,
                ],
                conditions: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'ForAnyValue:StringLike': {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        'kms:ResourceAliases': 'alias/PatternPublishPipeline-*',
                    },
                },
            })
        );
        // Add permission to all the pattern publish pipeline artifact buckets
        // This is to prevent exceeding the policy size limit
        updateBlueprintInfrastructureProjectRole.addToPrincipalPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:GetObject*', 's3:GetBucket*', 's3:List*'],
                resources: [
                    'arn:aws:s3:::blueprintinfrastructures-blueprintpublicationpipe*',
                    'arn:aws:s3:::blueprintinfrastructures-blueprintpublicationpipe*/*',
                ],
            })
        );

        updateBlueprintInfrastructureProjectRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['ssm:GetParameters'],
                resources: [
                    `arn:${Stack.of(this).partition}:ssm:${Stack.of(this).region}:${
                        Stack.of(this).account
                    }:parameter/${props.githubConnectionArnSsmParam}`,
                ],
            })
        );

        const updateBlueprintInfraStatusLambda = new aws_lambda_nodejs.NodejsFunction(
            this,
            'UpdateBlueprintInfraStatusLambda',
            {
                runtime: Runtime.NODEJS_14_X,
                handler: 'handler',
                entry: path.join(
                    __dirname,
                    '../lambda/blueprintgovernanceservice/src/handlers/UpdateBlueprintInfraStatusHandler.ts'
                ),
                timeout: Duration.minutes(1),
                vpc: props.vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                environment: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    RAPM_METADATA_TABLE_NAME: props.rapmMetaDataTable.tableName,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    LOG_LEVEL: props.logLevel,
                },
            }
        );
        NagSuppressions.addResourceSuppressions(
            updateBlueprintInfraStatusLambda,
            [
                {
                    id: 'AwsSolutions-IAM4',
                    reason: 'Need managed policy AWSLambdaBasicExecutionRole and AWSLambdaVPCAccessExecutionRole',
                },
                {
                    id: 'AwsSolutions-L1',
                    reason: 'Node 14 is still supported version and solution relies on this version.',
                },
            ],
            true
        );
        this.updateBlueprintInfraLambdaCfnNagSuppressions(
            updateBlueprintInfraStatusLambda
        );
        props.rapmMetaDataTable.grantWriteData(updateBlueprintInfraStatusLambda);

        // Give permission to describe stack to find the blueprint ID in the stack tags
        updateBlueprintInfraStatusLambda.addToRolePolicy(
            new PolicyStatement({
                actions: ['cloudformation:DescribeStacks'],
                resources: ['*'],
            })
        );

        // Grant permission to use encryption key to read from sns topic
        props.blueprintsnsEncryptionKey.grantEncryptDecrypt(
            updateBlueprintInfraStatusLambda
        );

        // Grant permission to use encryption key to write infrastructure status in dynamodb table
        props.rapmMetaDataTableEncryptionKey.grantEncryptDecrypt(
            updateBlueprintInfraStatusLambda
        );

        // Trigger the lambda that will update blueprint infra status when a infrastructure stack gets updated
        updateBlueprintInfraStatusLambda.addEventSource(
            new aws_lambda_event_sources.SnsEventSource(
                blueprintInfrastructureNotificationTopic
            )
        );
    }

    private updateBlueprintInfraProjectCfnNagSuppressions(): void {
        addCfnNagSuppression(
            this.updateBlueprintInfrastructureProject,
            [
                {
                    id: 'W12',
                    reason: 'The policy is generated by CDK. Also servicecatalog permissions needs to use *',
                },
            ],
            'PolicyDocument'
        );
        Aspects.of(this.updateBlueprintInfrastructureProject).add(
            new CfnNagResourcePathEndingWithSuppressionAspect(
                '/UpdateBlueprintInfrastructureProject/SecurityGroup/Resource',
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

    private updateBlueprintInfraLambdaCfnNagSuppressions(
        updateBlueprintInfraStatusLambda: aws_lambda_nodejs.NodejsFunction
    ): void {
        addCfnNagSuppression(updateBlueprintInfraStatusLambda, [
            {
                id: 'W58',
                reason: 'Lambda already has the required permission to write CloudWatch Logs via arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole.',
            },
            {
                id: 'W92',
                reason: 'Some new AWS accounts have very low limit for concurrency causing deployment to fail',
            },
        ]);
        Aspects.of(updateBlueprintInfraStatusLambda).add(
            new CfnNagResourcePathEndingWithSuppressionAspect(
                '/UpdateBlueprintInfraStatusLambda/SecurityGroup/Resource',
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

    private generateUpdateBlueprintInfrastructureBuildSpec(
        proxyUri: string | undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        blueprintInfrastructureSharedConfig: any,
        blueprintInfrastructureNotificationTopic: Topic,
        githubConnectionArnParamName: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): any {
        const buildSpec = {
            version: 0.2,
            env: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'parameter-store': {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    GITHUB_CONNECTION_ARN: githubConnectionArnParamName,
                },
            },
            phases: {
                install: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'runtime-versions': {
                        nodejs: 14,
                    },
                    commands: ['npm ci'],
                },
                build: {
                    commands: [
                        'npm run build',
                        'npm run cdk deploy -- --require-approval never' +
                            // ARNs of SNS topic that CloudFormation will notify with stack related events
                            ` --notification-arns="${blueprintInfrastructureNotificationTopic.topicArn}"` +
                            ` --context blueprintInfrastructureSharedConfigJson='${JSON.stringify(
                                blueprintInfrastructureSharedConfig
                            )}'` +
                            // Get blueprint specific stack context from the codebuild project environment variables
                            ' --context blueprintId=${BLUEPRINT_ID}' +
                            ' --context blueprintType=${BLUEPRINT_TYPE}' +
                            ' --context githubRepositoryOwner=${GITHUB_REPOSITORY_OWNER}' +
                            ' --context githubRepositoryName=${GITHUB_REPOSITORY_NAME}' +
                            ' --context githubRepositoryMainBranchName=${GITHUB_REPOSITORY_MAIN_BRANCH_NAME}' +
                            ' --context githubConnectionArn=${GITHUB_CONNECTION_ARN}',
                    ],
                },
            },
        };

        if (proxyUri) {
            // Configure npm to use http proxy
            buildSpec.phases.install.commands.unshift(
                `npm config set proxy http://${proxyUri}`,
                `npm config set https-proxy http://${proxyUri}`
            );
        }

        return buildSpec;
    }
}
