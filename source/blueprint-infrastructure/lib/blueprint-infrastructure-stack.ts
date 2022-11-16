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
    Aspects,
    aws_lambda_nodejs,
    CustomResource,
    custom_resources,
    Duration,
    Stack,
    StackProps,
} from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, Project, Source } from 'aws-cdk-lib/aws-codebuild';
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
import { BlueprintPublicationPipelineConstruct } from './blueprint-publication-pipeline-construct';
import { generateBuildStageBuildspec } from './buildspecs';
import {
    addCfnNagSuppression,
    CfnNagResourcePathEndingWithSuppressionAspect,
} from './cfn-nag-suppression';

export type BlueprintType = 'CDK' | 'CFN';

export type LogLevelType = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';

export interface BlueprintInfrastructureStackProps extends StackProps {
    blueprintId: string;
    blueprintType: BlueprintType;
    /**
     * Blueprint infrastructure shared configuration as a JSON string
     */
    blueprintInfrastructureSharedConfigJson: string;
    /**
     * Github repository owner
     */
    githubRepositoryOwner: string;
    /**
     * Github repository name
     */
    githubRepositoryName: string;
    /**
     * Name of the main branch that should trigger a new blueprint version on push
     */
    githubRepositoryMainBranchName: string;

    /**
     * CodeStar connection ARN
     */
    githubConnectionArn: string;
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
        props: BlueprintInfrastructureStackProps
    ) {
        super(scope, id, props);

        console.log(props.blueprintInfrastructureSharedConfigJson);
        const sharedConfig = JSON.parse(props.blueprintInfrastructureSharedConfigJson);

        // Lookup the VPC where the compute resources will get created
        const vpc = Vpc.fromLookup(this, 'BlueprintInfrastructureVPC', {
            vpcId: sharedConfig.vpcId,
        });

        const securityGroup = SecurityGroup.fromSecurityGroupId(
            this,
            'BlueprintInfrastructureSecurityGroup',
            sharedConfig.blueprintInfrastructureSecurityGroupId
        );

        // Generate the buildspec for the automated security check
        const buildSpecForSecurityCheckTriggerTypePr = generateBuildStageBuildspec(
            props.blueprintType,
            'PR',
            sharedConfig.proxyUri,
            sharedConfig.githubTokenSecretId,
            sharedConfig.githubUrl,
            props.githubRepositoryName,
            props.githubRepositoryOwner
        );

        // Generate the buildspec for the build stage in the publishing pipeline
        const buildSpecForSecurityCheckTriggerTypePipeline = generateBuildStageBuildspec(
            props.blueprintType,
            'Pipeline',
            sharedConfig.proxyUri
        );

        // Create the codebuild project that will automatically run checks on Github PRs
        const checksProject = new Project(this, 'BlueprintChecks', {
            projectName: `BlueprintChecks_${props.blueprintId}`,
            description: `Automated security checks for blueprint ${props.blueprintId}`,
            source: sharedConfig.githubUrl
                ? Source.gitHubEnterprise({
                      httpsCloneUrl: `${sharedConfig.githubUrl}/${props.githubRepositoryOwner}/${props.githubRepositoryName}`,
                  })
                : Source.gitHub({
                      owner: props.githubRepositoryOwner,
                      repo: props.githubRepositoryName,
                  }),
            environment: {
                buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromObject(buildSpecForSecurityCheckTriggerTypePr),
            vpc,
            subnetSelection: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [securityGroup],
        });
        checksProject.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [
                    `arn:aws:secretsmanager:${this.region}:${this.account}:secret:${sharedConfig.githubTokenSecretId}*`,
                ],
                actions: ['secretsmanager:GetSecretValue'],
            })
        );
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
            'PolicyDocument'
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
            ])
        );

        // Create the webhook to trigger the codebuild checks project everytime a new commit is pushed to the blueprint repository
        this.createGithubWebhook({
            project: checksProject,
            vpc,
            vpcsubnet: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroup,
            githubUrl: sharedConfig.githubUrl,
            githubTokenSecretId: sharedConfig.githubTokenSecretId,
            githubRepositoryOwner: props.githubRepositoryOwner,
            githubRepositoryName: props.githubRepositoryName,
            customUserAgent: sharedConfig.customUserAgent,
            logLevel: sharedConfig.logLevel,
        });

        // Create the publication pipeline for the blueprint
        const publicationPipelineConstruct = new BlueprintPublicationPipelineConstruct(
            this,
            'BlueprintPublicationPipeline',
            {
                vpc,
                securityGroup,
                blueprintId: props.blueprintId,
                blueprintType: props.blueprintType,
                releaseBranchName: props.githubRepositoryMainBranchName,
                githubRepositoryName: props.githubRepositoryName,
                githubRepositoryOwner: props.githubRepositoryOwner,
                githubRepositoryMainBranchName: props.githubRepositoryMainBranchName,
                githubConnectionArn: props.githubConnectionArn,
                buildSpec: buildSpecForSecurityCheckTriggerTypePipeline,
                sharedConfig,
            }
        );
        this.publicationPipelineCfnNagSuppressions(publicationPipelineConstruct);
    }

    private publicationPipelineCfnNagSuppressions(
        publicationPipelineConstruct: BlueprintPublicationPipelineConstruct
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
                ]
            )
        );
        Aspects.of(publicationPipelineConstruct).add(
            new CfnNagResourcePathEndingWithSuppressionAspect('/DefaultPolicy/Resource', [
                {
                    id: 'W76',
                    reason: 'The policy is implicitly generated by CDK.',
                },
            ])
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
            ])
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
        githubUrl: string;
        githubTokenSecretId: string;
        githubRepositoryOwner: string;
        githubRepositoryName: string;
        customUserAgent: string;
        logLevel: LogLevelType;
    }): void {
        const createGithubWebhookFunction = new aws_lambda_nodejs.NodejsFunction(
            this,
            'CreateGithubWebhookFunction',
            {
                runtime: Runtime.NODEJS_14_X,
                entry: path.join(__dirname, '../lambda/github/createWebhook.ts'),
                handler: 'handler',
                timeout: Duration.seconds(30),
                vpc: params.vpc,
                vpcSubnets: params.vpcsubnet,
                securityGroups: [params.securityGroup],
                environment: {
                    GITHUB_TOKEN_SECRET_ID: params.githubTokenSecretId,
                    GITHUB_URL: params.githubUrl,
                    GITHUB_REPO_OWNER: params.githubRepositoryOwner,
                    GITHUB_REPO_NAME: params.githubRepositoryName,
                    SOLUTION_USER_AGENT: params.customUserAgent,
                    LOG_LEVEL: params.logLevel,
                },
            }
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
            ])
        );

        createGithubWebhookFunction.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [params.project.projectArn],
                actions: ['codebuild:CreateWebhook'],
            })
        );

        createGithubWebhookFunction.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [
                    `arn:aws:secretsmanager:${this.region}:${this.account}:secret:${params.githubTokenSecretId}*`,
                ],
                actions: ['secretsmanager:GetSecretValue'],
            })
        );

        const createGithubWebhookProvider = new custom_resources.Provider(
            this,
            'CreateGithubWebhookProvider',
            {
                onEventHandler: createGithubWebhookFunction,
                vpc: params.vpc,
                securityGroups: [params.securityGroup],
            }
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
                ]
            )
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
                ]
            )
        );

        new CustomResource(this, 'CreateGithubWebhookResource', {
            serviceToken: createGithubWebhookProvider.serviceToken,
            properties: {
                PROJECT_NAME: params.project.projectName,
            },
        });
    }
}
