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
import { StackStatus } from '@aws-sdk/client-cloudformation';
import { Attribute } from '../common/common-types';

/**
 * Blueprint object
 */
export interface BlueprintObject {
    patternId: string;
    name: string;
    owner?: string;
    email?: string;
    description: string;
    patternType: string;
    infrastructureStackStatus?: StackStatus;
    patternRepoURL?: string;
    codeRepository: CodeRepository;
    deploymentPipelineArn?: string;
    updatedTimestamp: string;
    createdTimestamp: string;
    attributes?: Record<string, string>;
    lastCommitId?: string;
}

export interface BlueprintVersionObject {
    patternId: string;
    commitId: string;
    commitMessage: string;
    artifacts: BlueprintArtifact[];
    updatedTimestamp: string;
    createdTimestamp: string;
    changedPackages: NpmPackageDetails[];
    allPackages: NpmPackageDetails[];
    codeArtifactDetails?: CodeArtifactDetails;
    serviceCatalogProducts?: BlueprintServiceCatalogProduct[];
}

export interface NpmPackageDetails {
    name: string;
    version: string;
    location?: string;
}

export interface CodeArtifactDetails {
    account: string;
    region: string;
    codeArtifactDomainName: string;
    codeArtifactRepositoryName: string;
}

export interface BlueprintObjectWithPublishData {
    patternMetaData: BlueprintObject;
    lastCommitPublishData: BlueprintVersionObject;
}

/**
 * CFN Blueprint service catalog product
 */
export interface BlueprintServiceCatalogProduct {
    name: string;
    region?: string;
    account?: string;
    productId?: string;
    provisioningArtifactId?: string;
}

/**
 * Blueprint artifacts
 */
export interface BlueprintArtifact {
    location: string;
    type: 'CONTROL' | 'IMAGE' | 'MARKDOWN';
    name?: string;
}

/**
 * NPM Package of a CDK blueprint version
 */
export interface BlueprintNpmPackage {
    name: string;
    version: string;
    region?: string;
    account?: string;
    codeArtifactDomainName?: string;
    codeArtifactRepositoryName?: string;
}

/**
 * Paginated result
 * @template T
 */
export interface PaginatedResult<T> {
    readonly results: T;
    readonly nextToken?: string;
}

/**
 * Code repository
 */
export interface CodeRepository {
    type: string;
    repoOwner: string;
    branchName: string;
    repoName: string;
    detail?: Record<string, unknown>;
}

export const environmentContantValues = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    META_DATA: 'metadata',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    VERSION: 'version',
};

export interface GitTree {
    path: string;
    mode: string;
    type: string;
    sha: string;
}

export interface InputValidationResult {
    validated: boolean;
    errors: string[];
}

export interface AttributeInput {
    key: string;
    value: string;
    description?: string;
    metadata?: Record<string, string>;
}

export type QueryResult = [items: Attribute[], nextToken?: string];
