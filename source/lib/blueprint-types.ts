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

export type PatternType = 'CloudFormation' | 'CDK' | 'All';

export type LogLevelType = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';

export type WafScope = 'CLOUDFRONT' | 'REGIONAL';

export type OidcAuthorizeScope =
    | 'openid'
    | 'profile'
    | 'email'
    | 'address'
    | 'phone'
    | 'offline_access';

export type OidcClaim =
    | 'address'
    | 'birthdate'
    | 'email'
    | 'family_name'
    | 'gender'
    | 'given_name'
    | 'locale'
    | 'middle_name'
    | 'name'
    | 'nickname'
    | 'phone_number'
    | 'picture'
    | 'preferred_username'
    | 'profile'
    | 'updated_at'
    | 'website'
    | 'zoneinfo';

export interface IdentityProviderInfo {
    providerName: string;
    clientId: string;
    clientSecretArn?: string;
    oidcIssuer: string;
    authorizeScopes: OidcAuthorizeScope[];
    attributesRequestMethod?: 'GET' | 'POST';
    attributeMapping?: Record<OidcClaim, string>;
}

export interface GithubConfig {
    githubOrganization: string;
    githubTokenSecretId: string;
    githubConnectionArnSsmParam: string;
    githubUrl?: string;
    githubDomain?: string;
    githubDomainResolverIpAddresses?: string;
    githubCodeOwners?: string;
}

export type GithubConfigBlueprintInfraSharedConfig = Pick<
    GithubConfig,
    'githubUrl' | 'githubTokenSecretId'
>;

export interface CodeCommitConfig {
    patternRepoNotificationTopicArn: string;
}

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

export interface WafInfo {
    /**
     * IP addresses to be allowed to access API endpointd
     */
    allowedIPsForApi?: [];
    /**
     * Maximum number of calls from the same IP in a 5 minutes period
     */
    rateLimitForApi?: number;
    /**
     * Existing AWS WAF Web Acl Arn to associate with CloudFront
     * Example ARN: arn:aws:wafv2:us-east-1:123456789012:global/webacl/ExampleWebACL/473e64fd-f30b-4765-81a0-62ad96dd167a
     */
    wafCloudFrontWebAclArn?: string;
}

export type PatternRepoType = 'CodeCommit' | 'GitHub';

export interface SecurityScanTool {
    name: SecurityScanToolName;
    cfnGuardManagedRuleSets?: string[];
}

export type SecurityScanToolName = 'CfnGuard' | 'CfnNag' | 'Checkov';
