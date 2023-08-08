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

import { IRepository } from 'aws-cdk-lib/aws-codecommit';

export type BlueprintType = 'CDK' | 'CFN';

export type LogLevelType = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';

export type PatternRepoType = 'CodeCommit' | 'GitHub';

export interface BlueprintInfraSharedConfig {
    vpcId: string;
    blueprintInfrastructureBucketName: string;
    blueprintInfrastructureArchiveName: string;
    rapmMetaDataTable: string;
    rapmPublishDataTable: string;
    rapmAttributesTable: string;
    rapmMetaDataTableEncryptionKey?: string;
    rapmPublishDataTableEncryptionKey?: string;
    rapmAttributesTableEncryptionKey?: string;
    blueprintArtifactsBucketName: string;
    blueprintArtifactsBucketEncryptionKeyArn?: string;
    blueprintInfrastructureNotifTopicArn: string;
    blueprintGovernanceNotificationTopicArn: string;
    blueprintSnsEncryptionKeyArn: string;
    s3BucketEncryptionKeyArn: string;
    secretsManagerEncryptionKeyArn: string;
    codeArtifactDomainName: string;
    codeArtifactRepositoryName: string;
    blueprintServiceCatalogPortfolioId: string;
    customUserAgent: string;
    proxyUri: string;
    updateBlueprintInfrastructureProjectName: string;
    updateBlueprintInfrastructureProjectRoleArn: string;
    blueprintInfrastructureSecurityGroupId: string;
    solutionName: string;
    solutionTradeMarkName: string;
    logLevel: LogLevelType;
    securityScanTool: SecurityScanTool;
    githubConfig?: GithubConfigBlueprintInfraSharedConfig;
    codeCommitConfig?: CodeCommitConfig;
}

export interface SecurityScanTool {
    name: SecurityScanToolName;
    cfnGuardManagedRuleSets?: string[];
}

export type SecurityScanToolName = 'CfnGuard' | 'CfnNag' | 'Checkov';

export type GithubConfigBlueprintInfraSharedConfig = Pick<
    GithubConfig,
    'githubUrl' | 'githubTokenSecretId'
>;

export type GithubConfigPatternPublishPipeline = Pick<
    GithubConfig,
    'githubConnectionArn' | 'githubOrganization'
>;

export interface CodeCommitConfig {
    patternRepoNotificationTopicArn: string;
}

export interface GithubConfig {
    githubOrganization: string;
    githubTokenSecretId: string;
    githubConnectionArn: string;
    githubUrl?: string;
    githubDomain?: string;
    githubDomainResolverIpAddresses?: string;
}

export interface CodeCommitPipelineConfig {
    patternRepository: IRepository;
}
