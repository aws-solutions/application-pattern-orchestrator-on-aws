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
/* eslint-disable @typescript-eslint/naming-convention */
import {
    Arn,
    ArnFormat,
    Aspects,
    aws_lambda_nodejs,
    CustomResource,
    custom_resources,
    Duration,
    Stack,
    StackProps,
} from 'aws-cdk-lib';
import {
    BuildSpec,
    LinuxBuildImage,
    Project,
    ProjectProps,
    Source,
} from 'aws-cdk-lib/aws-codebuild';
import { Construct } from 'constructs';
import {
    ISecurityGroup,
    IVpc,
    SecurityGroup,
    SubnetSelection,
    SubnetType,
    Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import {
    BlueprintPublicationPipelineConstruct,
    BlueprintPublicationPipelineConstructProps,
} from './blueprint-publication-pipeline-construct';
import { generateBuildStageBuildspec } from './buildspecs';
import { Repository, RepositoryNotificationEvents } from 'aws-cdk-lib/aws-codecommit';
import {
    BlueprintInfraSharedConfig,
    BlueprintType,
    GithubConfigPatternPublishPipeline,
    LogLevelType,
    PatternRepoType,
} from './blueprint-infrastructure-types';
import {
    addCfnNagSuppression,
    CfnNagResourcePathEndingWithSuppressionAspect,
} from './cfn-nag-suppression';
import { DetailType } from 'aws-cdk-lib/aws-codestarnotifications';
import { Topic } from 'aws-cdk-lib/aws-sns';

export interface BlueprintInfrastructureStackProps extends StackProps {
    blueprintId: string;
    blueprintType: BlueprintType;
    /**
     * Blueprint infrastructure shared configuration as a JSON string
     */
    blueprintInfrastructureSharedConfigJson: string;
    /**
     * Github repository name
     */
    repositoryName: string;
    /**
     * Name of the main branch that should trigger a new blueprint version on push
     */
    repositoryMainBranchName: string;

    /**
     * GitHub specific config
     */
    githubConfig?: GithubConfigPatternPublishPipeline;
}

export class BlueprintInfrastructureStack extends Stack {
    /**
     * Create the following blueprint infrastructure
     *   - Codebuild project to validates Github PRs
     *   - Codepipeline to publish new blueprint versions
     * @param scope
     * @param id
     * @param props
     */
    public constructor(
        scope: Construct,
        id: string,
        props: BlueprintInfrastructureStackProps,
    ) {
        super(scope, id, props);

        const sharedConfig: BlueprintInfraSharedConfig = JSON.parse(
            props.blueprintInfrastructureSharedConfigJson,
        );

        // Lookup the VPC where the compute resources will get created
        const vpc = Vpc.fromLookup(this, 'BlueprintInfrastructureVPC', {
            vpcId: sharedConfig.vpcId,
        });

        const securityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'BlueprintInfrastructureSecurityGroup',
            sharedConfig.blueprintInfrastructureSecurityGroupId,
        );

        // Generate the buildspec for the automated security check
        const patternRepoType: PatternRepoType = props.githubConfig
            ? 'GitHub'
            : 'CodeCommit';
        const buildSpecForSecurityCheckTriggerTypePr = generateBuildStageBuildspec(
            props.blueprintType,
            'PR',
            patternRepoType,
            sharedConfig.securityScanTool,
            sharedConfig.proxyUri,
            props.githubConfig
                ? sharedConfig.githubConfig?.githubTokenSecretId
                : undefined,
            props.githubConfig ? sharedConfig.githubConfig?.githubUrl : undefined,
            props.repositoryName,
            props.githubConfig ? props.githubConfig.githubOrganization : undefined,
        );

        // Generate the buildspec for the build stage in the publishing pipeline
        const buildSpecForSecurityCheckTriggerTypePipeline = generateBuildStageBuildspec(
            props.blueprintType,
            'Pipeline',
            patternRepoType,
            sharedConfig.securityScanTool,
            sharedConfig.proxyUri,
        );

        // Create the codebuild project that will automatically run checks on source repo PRs
        const projectProps: ProjectProps = {
            projectName: `BlueprintChecks_${props.blueprintId}`,
            description: `Automated security checks for blueprint ${props.blueprintId}`,
            environment: {
                buildImage: LinuxBuildImage.STANDARD_7_0,
                privileged: true,
            },
            source: props.githubConfig
                ? sharedConfig.githubConfig?.githubUrl
                    ? Source.gitHubEnterprise({
                          httpsCloneUrl: `${sharedConfig.githubConfig.githubUrl}/${props.githubConfig.githubOrganization}/${props.repositoryName}`,
                      })
                    : Source.gitHub({
                          owner: props.githubConfig.githubOrganization,
                          repo: props.repositoryName,
                      })
                : Source.codeCommit({
                      repository: Repository.fromRepositoryName(
                          this,
                          `CodeCommitRepo${props.repositoryName}`,
                          props.repositoryName,
                      ),
                  }),
            buildSpec: BuildSpec.fromObject(buildSpecForSecurityCheckTriggerTypePr),
            vpc,
            subnetSelection: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [securityGroup],
        };

        const checksProject = new Project(this, 'BlueprintChecks', projectProps);
        if (props.githubConfig) {
            checksProject.addToRolePolicy(
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    resources: [
                        `arn:aws:secretsmanager:${this.region}:${this.account}:secret:${sharedConfig.githubConfig?.githubTokenSecretId}*`,
                    ],
                    actions: ['secretsmanager:GetSecretValue'],
                }),
            );
        } else {
            checksProject.addToRolePolicy(
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    resources: [
                        `arn:aws:codecommit:${this.region}:${this.account}:${props.repositoryName}`,
                    ],
                    actions: [
                        'codecommit:PostCommentForPullRequest',
                        'codecommit:CreatePullRequestApprovalRule',
                        'codecommit:GetPullRequest',
                        'codecommit:UpdatePullRequestApprovalState',
                    ],
                }),
            );
        }

        addCfnNagSuppression(
            checksProject,
            [
                {
                    id: 'W12',
                    reason: 'The policy is implicitly generated by CDK.',
                },
                {
                    id: 'W76',
                    reason: 'The policy is implicitly generated by CDK.',
                },
            ],
            'PolicyDocument',
        );
        Aspects.of(checksProject).add(
            new CfnNagResourcePathEndingWithSuppressionAspect('/SecurityGroup/Resource', [
                {
                    id: 'W40',
                    reason: 'Security group is created by CDK and is egress only',
                },
                {
                    id: 'W5',
                    reason: 'Security group is created by CDK and is egress only',
                },
            ]),
        );

        const blueprintPublicationPipelineConstructProps: BlueprintPublicationPipelineConstructProps =
            {
                vpc,
                securityGroup,
                blueprintId: props.blueprintId,
                blueprintType: props.blueprintType,
                buildSpec: buildSpecForSecurityCheckTriggerTypePipeline,
                sharedConfig,
                releaseBranchName: props.repositoryMainBranchName,
                repositoryName: props.repositoryName,
                repositoryMainBranchName: props.repositoryMainBranchName,
            };

        if (props.githubConfig && sharedConfig.githubConfig) {
            // Create the GitHub webhook to trigger the codebuild checks project everytime a new commit is pushed to the blueprint repository
            this.createGithubWebhook({
                project: checksProject,
                vpc,
                vpcsubnet: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroup,
                githubUrl: sharedConfig.githubConfig.githubUrl,
                githubTokenSecretId: sharedConfig.githubConfig.githubTokenSecretId,
                githubRepositoryOwner: props.githubConfig.githubOrganization,
                githubRepositoryName: props.repositoryName,
                customUserAgent: sharedConfig.customUserAgent,
                logLevel: sharedConfig.logLevel,
            });
            blueprintPublicationPipelineConstructProps.githubConfig = {
                githubConnectionArn: props.githubConfig.githubConnectionArn,
                githubOrganization: props.githubConfig.githubOrganization,
            };
        } else if (sharedConfig.codeCommitConfig) {
            const codeCommitPatternRepo = Repository.fromRepositoryName(
                this,
                `${props.repositoryName}`,
                props.repositoryName,
            );
            blueprintPublicationPipelineConstructProps.codeCommitPipelineConfig = {
                patternRepository: codeCommitPatternRepo,
            };

            const codeCommitPatternRepoNotificationTopic = Topic.fromTopicArn(
                this,
                `codeCommitPatternRepoNotificationTopic-${codeCommitPatternRepo.repositoryName}`,
                sharedConfig.codeCommitConfig.patternRepoNotificationTopicArn,
            );
            const synthTimeRegion = Arn.split(
                sharedConfig.codeCommitConfig.patternRepoNotificationTopicArn,
                ArnFormat.NO_RESOURCE_NAME,
            ).region;
            codeCommitPatternRepo.notifyOn(
                `codecommitPatternRepoNotification-${synthTimeRegion}-${codeCommitPatternRepo.repositoryName}`,
                codeCommitPatternRepoNotificationTopic,
                {
                    events: [
                        RepositoryNotificationEvents.PULL_REQUEST_CREATED,
                        RepositoryNotificationEvents.PULL_REQUEST_SOURCE_UPDATED,
                    ],
                    detailType: DetailType.BASIC,
                },
            );
        } else {
            throw new Error('Neither GitHub nor CodeCommit config supplied');
        }

        // Create the publication pipeline for the blueprint
        const publicationPipelineConstruct = new BlueprintPublicationPipelineConstruct(
            this,
            'BlueprintPublicationPipeline',
            blueprintPublicationPipelineConstructProps,
        );
        this.publicationPipelineCfnNagSuppressions(publicationPipelineConstruct);
    }

    private publicationPipelineCfnNagSuppressions(
        publicationPipelineConstruct: BlueprintPublicationPipelineConstruct,
    ): void {
        Aspects.of(publicationPipelineConstruct).add(
            new CfnNagResourcePathEndingWithSuppressionAspect(
                '/PolicyDocument/Resource',
                [
                    {
                        id: 'W12',
                        reason: 'The policy is implicitly generated by CDK.',
                    },
                    {
                        id: 'W76',
                        reason: 'The policy is implicitly generated by CDK.',
                    },
                ],
            ),
        );
        Aspects.of(publicationPipelineConstruct).add(
            new CfnNagResourcePathEndingWithSuppressionAspect('/DefaultPolicy/Resource', [
                {
                    id: 'W76',
                    reason: 'The policy is implicitly generated by CDK.',
                },
            ]),
        );
        Aspects.of(publicationPipelineConstruct).add(
            new CfnNagResourcePathEndingWithSuppressionAspect('/SecurityGroup/Resource', [
                {
                    id: 'W40',
                    reason: 'Security group is created by CDK and is egress only',
                },
                {
                    id: 'W5',
                    reason: 'Security group is created by CDK and is egress only',
                },
            ]),
        );
    }

    /**
     * Create Github enterprise webhooks to automatically trigger a codebuild project.
     * Cloudformation does not support creating webhook for Github Enterprise so use a custom resource instead.
     * @param params
     */
    public createGithubWebhook(params: {
        project: Project;
        vpc: IVpc;
        vpcsubnet: SubnetSelection;
        securityGroup: ISecurityGroup;
        githubTokenSecretId: string;
        githubRepositoryOwner: string;
        githubRepositoryName: string;
        customUserAgent: string;
        logLevel: LogLevelType;
        githubUrl?: string;
    }): void {
        const createGithubWebhookFunction = new aws_lambda_nodejs.NodejsFunction(
            this,
            'CreateGithubWebhookFunction',
            {
                runtime: Runtime.NODEJS_18_X,
                entry: path.join(__dirname, '../lambda/github/createWebhook.ts'),
                handler: 'handler',
                timeout: Duration.seconds(30),
                vpc: params.vpc,
                vpcSubnets: params.vpcsubnet,
                securityGroups: [params.securityGroup],
                environment: {
                    GITHUB_TOKEN_SECRET_ID: params.githubTokenSecretId,
                    GITHUB_URL: params.githubUrl ?? '',
                    GITHUB_REPO_OWNER: params.githubRepositoryOwner,
                    GITHUB_REPO_NAME: params.githubRepositoryName,
                    SOLUTION_USER_AGENT: params.customUserAgent,
                    LOG_LEVEL: params.logLevel,
                },
            },
        );
        addCfnNagSuppression(createGithubWebhookFunction, [
            {
                id: 'W58',
                reason: 'The permission to write to CloudWatch Logs already exists',
            },
            {
                id: 'W92',
                reason: 'Some new AWS accounts have very low limit for concurrency causing deployment to fail',
            },
        ]);
        Aspects.of(createGithubWebhookFunction).add(
            new CfnNagResourcePathEndingWithSuppressionAspect('/SecurityGroup/Resource', [
                {
                    id: 'W40',
                    reason: 'Security group is created by CDK and is egress only',
                },
                {
                    id: 'W5',
                    reason: 'Security group is created by CDK and is egress only',
                },
            ]),
        );

        createGithubWebhookFunction.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [params.project.projectArn],
                actions: ['codebuild:CreateWebhook'],
            }),
        );

        createGithubWebhookFunction.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [
                    `arn:aws:secretsmanager:${this.region}:${this.account}:secret:${params.githubTokenSecretId}*`,
                ],
                actions: ['secretsmanager:GetSecretValue'],
            }),
        );

        const createGithubWebhookProvider = new custom_resources.Provider(
            this,
            'CreateGithubWebhookProvider',
            {
                onEventHandler: createGithubWebhookFunction,
                vpc: params.vpc,
                securityGroups: [params.securityGroup],
            },
        );
        Aspects.of(createGithubWebhookProvider).add(
            new CfnNagResourcePathEndingWithSuppressionAspect(
                '/framework-onEvent/Resource',
                [
                    {
                        id: 'W58',
                        reason: 'Lambda already has the required permission to write CloudWatch Logs via arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole.',
                    },
                    {
                        id: 'W92',
                        reason: 'Lambda is automatically created by CDK',
                    },
                ],
            ),
        );
        Aspects.of(createGithubWebhookProvider).add(
            new CfnNagResourcePathEndingWithSuppressionAspect(
                '/framework-onEvent/SecurityGroup/Resource',
                [
                    {
                        id: 'W40',
                        reason: 'Security group is created by CDK and is egress only',
                    },
                    {
                        id: 'W5',
                        reason: 'Security group is created by CDK and is egress only',
                    },
                ],
            ),
        );

        new CustomResource(this, 'CreateGithubWebhookResource', {
            serviceToken: createGithubWebhookProvider.serviceToken,
            properties: {
                PROJECT_NAME: params.project.projectName,
            },
        });
    }
}
