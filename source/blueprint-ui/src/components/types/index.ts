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

export interface Pattern {
    metadata: PatternMetadata;
    lastCommitPublishData?: PatternPublishData;
}

export type PatternType = 'CDK' | 'CFN';

export interface PatternCodeRepository {
    branchName: string;
    type: string;
    repoOwner: string;
    repoName: string;
}

export interface PatternMetadata {
    patternId: string;
    name: string;
    description: string;
    patternType: PatternType;
    updatedTimestamp: string;
    createdTimestamp: string;
    infrastructureStackStatus?: string;
    patternRepoURL?: string;
    codeRepository?: PatternCodeRepository;
    lastCommitId?: string;
    attributes?: Record<string, string>;
}

export interface PatternWithPublishData {
    patternMetaData: PatternMetadata;
    lastCommitPublishData?: PatternPublishData;
}

export interface GetPatternsApiResponse {
    results: PatternWithPublishData[];
}

export interface PatternPublishData {
    patternId: string;
    commitId: string;
    commitMessage: string;
    artifacts: PatternArtifact[];
    updatedTimestamp: string;
    createdTimestamp: string;
    allPackages: NpmPackageDetails[];
    changedPackages: NpmPackageDetails[];
    changedServiceCatalogProducts?: PatternServiceCatalogProduct[];
    allServiceCatalogProducts?: PatternServiceCatalogProduct[];
    codeArtifactDetails?: CodeArtifactDetails;
}

export interface NpmPackageDetails {
    name: string;
    version: string;
}

export interface PatternArtifact {
    location: string;
    type: 'CONTROL' | 'IMAGE' | 'MARKDOWN';
    name?: string;
}

export interface PatternServiceCatalogProduct {
    name: string;
    region: string;
    account: string;
    productId?: string;
    provisioningArtifactId?: string;
}

export interface CodeArtifactDetails {
    account: string;
    region: string;
    codeArtifactDomainName: string;
    codeArtifactRepositoryName: string;
}

export interface CreatePatternParams {
    name: string;
    description: string;
    patternType: PatternType;
}

export interface UpdatePatternParams extends Omit<CreatePatternParams, 'patternType'> {
    attributes?: Record<string, string>;
}

export interface CreatePatternRequestProps {
    name: string;
    description: string;
    patternType: PatternType;
    attributes?: Record<string, string>;
}

export interface UpdatePatternRequestProps
    extends Omit<CreatePatternRequestProps, 'name' | 'patternType'> {
    patternId: string;
}

export interface PatternFormData {
    name: string;
    description: string;
    patternType: PatternType;
    attributes?: KeyValuePairType[];
}

export interface KeyValuePairType {
    key: string;
    value: string;
}

export interface Attribute {
    name: string;
    key: string;
    value: string;
    description: string;
    metadata: Record<string, string>;
    createTime: string;
    lastUpdateTime: string;
}

export interface GetAttributeApiResponse {
    results: Attribute[];
}

export type CreateAttributeParams = Omit<
    Attribute,
    'name' | 'createTime' | 'lastUpdateTime'
>;

export type CreateAttributeResponse = Attribute;

export interface AttributeFormData {
    key: string;
    value: string;
    description: string;
    metadata: KeyValuePairType[];
}

export interface AttributeFormDataWithName extends AttributeFormData {
    name: string;
}

export interface AttributeSummary {
    name: string;
    key: string;
    value: string;
    createTime: string;
    lastUpdateTime: string;
}

export interface UpdateAttributeParams extends CreateAttributeParams {
    name: string;
}

export type UpdateAttributeResponse = Attribute;

export interface DeleteAttributeParams {
    name: string;
}

export interface AttributeDetailProps {
    attribute?: Attribute;
}

export interface User {
    email: string;
}
