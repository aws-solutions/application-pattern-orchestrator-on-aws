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
import { CfnParameter, RemovalPolicy, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BlueprintAuthentication } from './blueprint-authentication';
import { BlueprintBaseInfra, BlueprintBaseInfraProps } from './blueprint-base-infra';
import { BlueprintBackend } from './blueprint-backend';
import { BlueprintFrontend } from './blueprint-frontend';
import {
    GitHubEnterpriseSourceCredentials,
    GitHubSourceCredentials,
} from 'aws-cdk-lib/aws-codebuild';
import {
    GithubConfig,
    IdentityProviderInfo,
    LogLevelType,
    PatternType,
    WafInfo,
} from './blueprint-types';
import { BlueprintFrontendConfig } from './blueprint-frontend-config';
import { BlueprintNotification } from './blueprint-notification';
import { OperationalMetricsCollection } from './operational-metrics-construct';
import { IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { BlueprintDashboard } from './blueprint-dashboard';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';

export interface BlueprintStackProps extends StackProps {
    // Solution information
    readonly solutionId: string;
    readonly solutionName: string;
    readonly solutionTradeMarkName: string;
    readonly solutionVersion: string;
    readonly customUserAgent: string;
    readonly removalPolicy: RemovalPolicy;
    readonly logLevel: LogLevelType;
    readonly cognitoDomainPrefix?: string;
    readonly identityProviderInfo?: IdentityProviderInfo;
    readonly vpcCidr?: string;
    readonly wafInfo?: WafInfo;
    readonly githubConfig?: GithubConfig;
}

export class BlueprintStack extends Stack {
    private readonly props: BlueprintStackProps;

    public constructor(scope: Construct, props: BlueprintStackProps) {
        super(scope, 'ApoStack', props);

        this.props = props;

        const adminEmailParam = new CfnParameter(this, 'adminEmail', {
            type: 'String',
            description: `Admin user email address to access the ${props.solutionName} UI`,
            allowedPattern:
                '^[_A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(\\.[A-Za-z0-9]+)*(\\.[A-Za-z]{2,})$',
            constraintDescription: 'Admin email must be a valid email address',
            minLength: 5,
        });

        const patternTypeParam = new CfnParameter(this, 'patternType', {
            type: 'String',
            description: [
                'The type of patterns that the solution supports.',
                'Cloudformation Pattern are automatically added to a Service Catalog of IT services that are approved for use on AWS.',
                'CDK Pattern provide well-architected CDK constructs to solve specific problems.',
            ].join(' '),
            allowedValues: ['CloudFormation', 'CDK', 'All'],
            default: 'CloudFormation',
        });

        const sendAnonymousDataParam = new CfnParameter(this, 'sendAnonymousData', {
            type: 'String',
            description: [
                'Send anonymous operational metrics to AWS.',
                'We use this data to better understand how customers use this solution and related services and products.',
                'Choose No to opt out of this feature.',
            ].join(' '),
            default: 'Yes',
            allowedValues: ['Yes', 'No'],
        });

        if (props.githubConfig) {
            this.setupSourceCredentials(
                props.githubConfig.githubTokenSecretId,
                props.githubConfig.githubUrl
            );
        }

        const blueprintBaseInfraProps: BlueprintBaseInfraProps = {
            vpcCidr: props.vpcCidr,
        };
        if (props.githubConfig) {
            blueprintBaseInfraProps.githubDomain = props.githubConfig.githubDomain;
            blueprintBaseInfraProps.githubDomainResolverIpAddresses =
                props.githubConfig.githubDomainResolverIpAddresses;
        }
        const blueprintInfra = new BlueprintBaseInfra(
            this,
            'RapmBaseInfra',
            blueprintBaseInfraProps
        );

        const anonymousDataUUID = this.createOperationalMetrics(
            sendAnonymousDataParam.valueAsString,
            blueprintInfra.vpc,
            patternTypeParam.valueAsString as PatternType,
            props.removalPolicy,
            props.logLevel
        );

        const blueprintFrontend = new BlueprintFrontend(this, 'RapmFrontend', {
            webAclArn: props.wafInfo?.wafCloudFrontWebAclArn,
            removalPolicy: props.removalPolicy,
        });

        const blueprintAuth = new BlueprintAuthentication(this, 'RapmAuthentication', {
            solutionName: props.solutionName,
            adminEmail: adminEmailParam.valueAsString,
            cloudFrontDomainName: blueprintFrontend.distribution.distributionDomainName,
            cognitoDomainPrefix: props.cognitoDomainPrefix,
            identityProviderInfo: props.identityProviderInfo,
            anonymousDataUUID,
            removalPolicy: props.removalPolicy,
        });

        const patternEmailTable = new Table(this, 'pattern-email-mapping-table', {
            partitionKey: { name: 'patternId', type: AttributeType.STRING },
            sortKey: { name: 'email', type: AttributeType.STRING },
            removalPolicy: props.removalPolicy,
            billingMode: BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            encryptionKey: new Key(this, 'pattern-email-table-cmk', {
                removalPolicy: RemovalPolicy.DESTROY,
                description: 'KMS Key for app-pattern/pattern-email-table',
                alias: 'pattern-email-mapping-table',
                enableKeyRotation: true,
            }),
        });

        const blueprintBackend = new BlueprintBackend(this, 'RapmBackend', {
            vpc: blueprintInfra.vpc,
            solutionId: props.solutionId,
            solutionTradeMarkName: props.solutionTradeMarkName,
            solutionName: props.solutionName,
            solutionVersion: props.solutionVersion,
            cognitoUserPoolArn: blueprintAuth.userPoolArn,
            customUserAgent: props.customUserAgent,
            githubConfig: props.githubConfig,
            patternType: patternTypeParam.valueAsString as PatternType,
            anonymousDataUUID,
            patternEmailTable,
            wafInfo: props.wafInfo,
            removalPolicy: props.removalPolicy,
            logLevel: props.logLevel,
        });

        new BlueprintFrontendConfig(this, 'RapmFrontendConfig', {
            vpc: blueprintInfra.vpc,
            frontendBucket: blueprintFrontend.frontendBucket,
            distribution: blueprintFrontend.distribution,
            backendApiUrl: blueprintBackend.blueprintPortalService.blueprintapi.apiUrl,
            appClientId: blueprintAuth.appClientId,
            identityPoolId: blueprintAuth.identityPoolId,
            userPoolId: blueprintAuth.userPoolId,
            patternType: patternTypeParam.valueAsString as PatternType,
            cognitoDomain: blueprintAuth.cognitoDomain,
        });

        const notification = new BlueprintNotification(this, 'notification-component', {
            vpc: blueprintInfra.vpc,
            topic: blueprintBackend.blueprintInfrastructureSetup
                .blueprintGovernanceNotificationTopic,
            email: adminEmailParam.valueAsString,
            patternEmailTable,
            logLevel: props.logLevel,
        });

        new BlueprintDashboard(this, 'blueprint-dashboard', {
            apiName: blueprintBackend.blueprintPortalService.blueprintapi.api.restApiName,
            solutionName: props.solutionName,
            lambdaFunctions: [
                {
                    ...blueprintBackend.blueprintPortalService.bgsFunction.lambdaFunction,
                    friendlyName: 'RAPM Service Function',
                },
                { ...notification.emailSenderFn, friendlyName: 'Email Sender Function' },
            ],
            dynamoDBTables: [
                {
                    tableName: blueprintBackend.rapmMetaDataTable.tableName,
                    friendlyName: 'RAPM_MetaData',
                },
                {
                    tableName: blueprintBackend.rapmPublishDataTable.tableName,
                    friendlyName: 'RAPM_PublishData',
                },
                {
                    tableName: blueprintBackend.rapmAttributesTable.tableName,
                    friendlyName: 'RAPM_Attributes',
                },
                {
                    tableName: patternEmailTable.tableName,
                    friendlyName: 'Pattern_Email_Mapping',
                },
            ],
        });
    }

    private setupSourceCredentials(
        githubTokenSecretId: string,
        githubUrl?: string
    ): void {
        githubUrl
            ? new GitHubEnterpriseSourceCredentials(
                  this,
                  'GitHubEnterpriseSourceCredentials',
                  {
                      accessToken: SecretValue.secretsManager(githubTokenSecretId),
                  }
              )
            : new GitHubSourceCredentials(this, 'GitHubSourceCredentials', {
                  accessToken: SecretValue.secretsManager(githubTokenSecretId),
              });
    }

    private createOperationalMetrics(
        sendAnonymousData: string,
        vpc: IVpc,
        patternType: PatternType,
        removalPolicy: RemovalPolicy,
        logLevel: LogLevelType
    ): string {
        const opMetrics = new OperationalMetricsCollection(
            this,
            'operational-metrics-collection',
            {
                awsSolutionId: this.props.solutionId,
                awsSolutionVersion: this.props.solutionVersion,
                sendAnonymousData,
                retainData: removalPolicy === RemovalPolicy.RETAIN ? 'Yes' : 'No',
                vpc,
                vpcsubnet: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                patternType: patternType,
                logLevel,
            }
        );

        return opMetrics.anonymousDataUUID;
    }
}
