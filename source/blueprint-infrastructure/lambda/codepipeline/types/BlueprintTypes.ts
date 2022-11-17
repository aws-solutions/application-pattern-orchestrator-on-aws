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
/**
 * Blueprint version object
 */
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
    changedServiceCatalogProducts?: BlueprintServiceCatalogProduct[];
    allServiceCatalogProducts?: BlueprintServiceCatalogProduct[];
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
