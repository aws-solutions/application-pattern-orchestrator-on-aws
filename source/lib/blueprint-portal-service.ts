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
import { Construct } from 'constructs';
import { Duration, Aspects, Aws, RemovalPolicy } from 'aws-cdk-lib';
import * as envConfig from './blueprint-environment';
import { AWSLambdaFunction } from './infra-utils/aws-lambda-function';
import { AWSRestApi } from './infra-utils/aws-rest-api';
import { BlueprintApiDefinition } from './blueprint-api-definition';
import { BlueprintArtifactApiDefinition } from './blueprint-artifact-api-definition';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { UsagePlan } from 'aws-cdk-lib/aws-apigateway';
import { Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import {
    addCfnNagSuppression,
    CfnNagResourcePathEndingWithSuppressionAspect,
} from './cfn-nag-suppression';
import { AWSWafWebACL } from './infra-utils/aws-waf-web-acl';
import { CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
import { LogLevelType, WafInfo } from './blueprint-types';

export interface BlueprintPortalServiceProps {
    cognitoUserPoolArn: string;
    rapmMetaDataTable: ITable;
    rapmPublishDataTable: ITable;
    rapmAttributesTable: ITable;
    appRegistryUpdateQueue: Queue;
    blueprintCodeBuildProjectName: string;
    s3encryptionKey: IKey;
    lambdaEncryptionKey: IKey;
    blueprintArtifactsBucket: IBucket;
    vpc: IVpc;
    solutionId: string;
    solutionVersion: string;
    anonymousDataUUID?: string;
    customUserAgent: string;
    githubTokenSecretId: string;
    githubUrl?: string;
    githubOrganization: string;
    codeOwners?: string;
    proxiUri?: string;
    patternEmailTable: ITable;
    wafInfo?: WafInfo;
    removalPolicy: RemovalPolicy;
    logLevel: LogLevelType;
}

export class BlueprintPortalService extends Construct {
    public readonly bgsFunction: AWSLambdaFunction;
    public readonly blueprintapi: AWSRestApi;

    public constructor(scope: Construct, id: string, props: BlueprintPortalServiceProps) {
        super(scope, id);

        const proxyUri: string | undefined = props.proxiUri;

        const additionalPolicies = [
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['ssm:List*', 'ssm:Describe*', 'ssm:Get*'],
                resources: ['*'],
            }),
            PolicyStatement.fromJson({
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Effect: Effect.ALLOW,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Action: 'execute-api:Invoke',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Resource: 'arn:aws:execute-api:*:*:*/*/*/*',
            }),
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['secretsmanager:GetRandomPassword'],
                resources: ['*'],
            }),
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['secretsmanager:GetSecretValue'],
                resources: ['*'],
            }),
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['codebuild:StartBuild'],
                resources: ['*'],
            }),
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'kms:Decrypt',
                    'kms:List*',
                    'kms:DescribeKey',
                    'kms:GenerateDataKey*',
                    'kms:ReEncrypt*',
                    'kms:Encrypt',
                ],
                resources: [`${props.lambdaEncryptionKey.keyArn}`],
            }),
            new PolicyStatement({
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
            }),
        ];

        const lambdaEnvironmentVariables = {
            [envConfig.environmentVariables.RAPM_METADATA_TABLE_NAME]:
                props.rapmMetaDataTable.tableName,

            [envConfig.environmentVariables.RAPM_PUBLISH_DATA_TABLE_NAME]:
                props.rapmPublishDataTable.tableName,

            [envConfig.environmentVariables.RAPM_ATTRIBUTES_TABLE_NAME]:
                props.rapmAttributesTable.tableName,

            [envConfig.environmentVariables.APPREGISTRY_UPDATER_QUEUE_URL]:
                props.appRegistryUpdateQueue.queueUrl,

            [envConfig.environmentVariables.GITHUB_TOKEN_SECRET_ID]:
                props.githubTokenSecretId,

            [envConfig.environmentVariables.BLUEPRINT_CODE_BUILD_JOB_PROJECT_NAME]:
                props.blueprintCodeBuildProjectName,

            [envConfig.environmentVariables.GITHUB_URL]: props.githubUrl ?? '',

            [envConfig.environmentVariables.CODEOWNERS]: props.codeOwners ?? '',

            [envConfig.environmentVariables.GITHUB_ORGANIZATION]:
                props.githubOrganization,

            [envConfig.environmentVariables.SOLUTION_ID]: props.solutionId,

            [envConfig.environmentVariables.SOLUTION_VERSION]: props.solutionVersion,

            [envConfig.environmentVariables.SOLUTION_USER_AGENT]: props.customUserAgent,
            [envConfig.environmentVariables.PATTERN_EMAIL_MAPPING_TABLE_NAME]:
                props.patternEmailTable.tableName,
            [envConfig.environmentVariables.LOG_LEVEL]: props.logLevel,
        };

        if (proxyUri) {
            lambdaEnvironmentVariables[envConfig.environmentVariables.PROXY_URI] =
                proxyUri;
        }

        if (props.anonymousDataUUID) {
            lambdaEnvironmentVariables[
                envConfig.environmentVariables.ANONYMOUS_DATA_UUID
            ] = props.anonymousDataUUID;
        }

        const bgsFunctionName = 'blueprintgovernanceservice';

        this.bgsFunction = new AWSLambdaFunction(this, bgsFunctionName, {
            handler: 'app.lambdaHandler',
            code: Code.fromAsset(
                path.resolve(
                    __dirname,
                    `../lambda/${bgsFunctionName}/dist/${bgsFunctionName}`
                )
            ),
            description: 'Blueprint Governance Runtime Governance Lambda',
            timeout: Duration.seconds(60),
            runtime: Runtime.NODEJS_14_X,
            initialPolicy: [...additionalPolicies],
            environment: lambdaEnvironmentVariables,
            maxEventAge: Duration.seconds(60),
            retryAttempts: 1,
            memorySize: 2048,
            environmentEncryption: props.lambdaEncryptionKey,
            vpc: props.vpc,
            name: 'AWSPattern',
        });

        props.patternEmailTable.grantReadWriteData(this.bgsFunction.lambdaFunction);

        this.blueprintGovernanceLambdaServiceCfnNagSuppressions();

        props.rapmMetaDataTable.grantReadWriteData(this.bgsFunction.lambdaFunction);
        props.rapmPublishDataTable.grantReadWriteData(this.bgsFunction.lambdaFunction);
        props.rapmAttributesTable.grantReadWriteData(this.bgsFunction.lambdaFunction);
        props.appRegistryUpdateQueue.grantSendMessages(this.bgsFunction.lambdaFunction);

        this.blueprintapi = new AWSRestApi(this, 'Api', {
            lambdaFunction: this.bgsFunction,
            allowedExternalUserAWSRoleNames: ['*'],
            enableProxyAll: false,
            binaryMediaTypes: [
                'application/octet-stream',
                'image/png',
                'image/jpeg',
                'application/pdf',
                'multipart/form-data',
            ],
            apiGatewayType: this.node.tryGetContext('apiGatewayType'),
            apigatewayVpcEndpoint: this.node.tryGetContext('apigatewayVpcEndpoint'),
            serviceName: 'AWSPattern',
            apiGatewayWebAclArn: this.node.tryGetContext('apiGatewayWebAclArn'),
            cognitoUserPoolArn: props.cognitoUserPoolArn,
            removalPolicy: props.removalPolicy,
        });

        new BlueprintApiDefinition(this, 'api-definition', {
            blueprintApiGateway: this.blueprintapi.api,
            methodProps: this.blueprintapi.methodProps,
        });

        new BlueprintArtifactApiDefinition(this, 'artifact-api-definition', {
            blueprintApiGateway: this.blueprintapi.api,
            blueprintArtifactsBucket: props.blueprintArtifactsBucket,
            methodProps: this.blueprintapi.methodProps,
        });
        new UsagePlan(this, 'blueprint-usage-plan', {
            name: 'blueprint-api-usage-plan',
            apiStages: [
                {
                    api: this.blueprintapi.api,
                    stage: this.blueprintapi.api.deploymentStage,
                },
            ],
        });
        // Regional WAF WebAcl for API gateway
        const wafRegionalWebAcl = new AWSWafWebACL(this, 'RAPM_ApiWafWebACL', {
            name: 'RAPMApiGatewayWaf',
            description: 'Web ACL for API Gateway',
            wafScope: 'REGIONAL',
            sampleRequestsEnabled: true,
            rateLimit: props.wafInfo?.rateLimitForApi ?? 1000,
            enableManagedRules: true,
            allowList: props.wafInfo?.allowedIPsForApi ?? [],
        });

        // Associate regional WebAcl with API Gateway
        const cfnWebACLAssociation = new CfnWebACLAssociation(
            this,
            'RAPMApiWafAssociation',
            {
                resourceArn: `arn:aws:apigateway:${Aws.REGION}::/restapis/${this.blueprintapi.api.restApiId}/stages/${this.blueprintapi.api.deploymentStage.stageName}`,
                webAclArn: wafRegionalWebAcl.webAcl.attrArn,
            }
        );

        cfnWebACLAssociation.node.addDependency(this.blueprintapi);
    }

    private blueprintGovernanceLambdaServiceCfnNagSuppressions(): void {
        addCfnNagSuppression(
            this.bgsFunction.lambdaExecutionRole,
            [
                {
                    id: 'W12',
                    reason: 'The policy is generated by CDK. Also servicecatalog permissions needs to use *',
                },
                {
                    id: 'W76',
                    reason: 'Most Permissions are added by CDK implicitly.',
                },
            ],
            'DefaultPolicy'
        );
        addCfnNagSuppression(this.bgsFunction.lambdaExecutionRole, [
            {
                id: 'W11',
                reason: 'The policy is generated by CDK. Also servicecatalog permissions needs to use *',
            },
        ]);
        addCfnNagSuppression(this.bgsFunction.lambdaFunction, [
            {
                id: 'W58',
                reason: 'The permission to write to CloudWatch Logs already exists',
            },
            {
                id: 'W92',
                reason: 'Some new AWS accounts have very low limit for concurrency causing deployment to fail',
            },
        ]);
        Aspects.of(this.bgsFunction.lambdaFunction).add(
            new CfnNagResourcePathEndingWithSuppressionAspect(
                '/blueprintgovernanceservice/LambdaFunction/SecurityGroup/Resource',
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
}
