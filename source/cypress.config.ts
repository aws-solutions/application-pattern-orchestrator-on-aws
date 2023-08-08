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
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { defineConfig } from 'cypress';
import * as fs from 'fs';
import * as path from 'path';
import * as octokit from '@octokit/rest';
import axios from 'axios';
import { Amplify, Auth } from 'aws-amplify';
import {
    ServiceCatalogClient,
    DisassociateProductFromPortfolioCommand,
    ListPortfoliosCommand,
    DescribeProductAsAdminCommand,
    DeleteProductCommand,
} from '@aws-sdk/client-service-catalog';
import {
    DynamoDBClient,
    ListTablesCommand,
    DeleteItemCommand,
    QueryCommand,
} from '@aws-sdk/client-dynamodb';

import {
    CloudFormationClient,
    waitUntilStackDeleteComplete,
    DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';

import { CodeartifactClient, DeletePackageCommand } from '@aws-sdk/client-codeartifact';

import {
    GetBranchCommand,
    DeleteRepositoryCommand,
    CodeCommitClient,
    CreateCommitCommand,
    PutFileEntry,
} from '@aws-sdk/client-codecommit';

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const codeArtifactClient = new CodeartifactClient({});
const cfnClient = new CloudFormationClient({});
const ddbClient = new DynamoDBClient({});
const scClient = new ServiceCatalogClient({});
const codeCommitClient = new CodeCommitClient({});

async function deleteNpmPackagesFromCodeArtifact(): Promise<void> {
    const packageNames = ['compliant-dynamodbtable', 'compliant-s3-bucket'];
    for (const packageName of packageNames) {
        await codeArtifactClient.send(
            new DeletePackageCommand({
                domain: 'awspatterns',
                repository: 'awspatterns',
                format: 'npm',
                package: packageName,
                namespace: 'cypress-cdk',
            }),
        );
        console.log(`Deleted the npm package ${packageName}`);
    }
}

// Delete GitHub pattern's source code repo
async function deleteGithubSourceCodeRepo(
    githubBaseUrl: string,
    githubToken: string,
    githubOrg: string,
    repoName: string,
): Promise<void> {
    const octokit = getOctokit(githubBaseUrl, githubToken);
    await octokit.request(`DELETE /repos/${githubOrg}/${repoName}`);
    console.log(`Deleted github source code repo: ${repoName}`);
}

// Delete CodeCommit pattern's source code repo
async function deleteCodeCommmitSourceCodeRepo(repositoryName: string): Promise<void> {
    await codeCommitClient.send(
        new DeleteRepositoryCommand({
            repositoryName,
        }),
    );
    console.log(`Deleted codecommit source code repo: ${repositoryName}`);
}

// delete pattern's publishing pipeline
async function deletePatternStack(patternName: string): Promise<void> {
    const stackName = `BlueprintInfrastructureStack${patternName}`;
    console.log(`Deleting pattern stack: ${stackName}`);
    await cfnClient.send(
        new DeleteStackCommand({
            StackName: stackName,
        }),
    );

    await waitUntilStackDeleteComplete(
        {
            client: cfnClient,
            maxWaitTime: 90 * 60,
        },
        {
            StackName: stackName,
        },
    );
    console.log(`Stack: ${stackName} deletion completed successfully`);
}

// Clear pattern's data from dynamodb tables
async function deleteFromDynamoDbTable(patternName: string): Promise<void> {
    // get table names
    const listTablesResponse = await ddbClient.send(new ListTablesCommand({}));
    const publishTableArr = listTablesResponse.TableNames?.filter((item) =>
        item.startsWith('ApoStack-RapmBackendrapmPublishDataTable'),
    );
    if (publishTableArr) {
        if (publishTableArr.length > 1) {
            throw new Error('Found multiple publish tables');
        }
        const publishTableName = publishTableArr[0];
        const metaDataTableArr = listTablesResponse.TableNames?.filter((item) =>
            item.startsWith('ApoStack-RapmBackendrapmMetaDataTable'),
        );
        if (metaDataTableArr) {
            if (metaDataTableArr.length > 1) {
                throw new Error('Found multiple metadata tables');
            }
            const metaDataTableName = metaDataTableArr[0];

            // get publish data
            const queryCommandRes = await ddbClient.send(
                new QueryCommand({
                    TableName: publishTableName,
                    KeyConditionExpression: 'patternId = :patternId',
                    ExpressionAttributeValues: {
                        ':patternId': { S: patternName },
                    },
                }),
            );

            // delete publish data for pattern
            if (queryCommandRes.Items) {
                for (const patternPublishItem of queryCommandRes.Items) {
                    await ddbClient.send(
                        new DeleteItemCommand({
                            TableName: publishTableName,
                            Key: {
                                patternId: {
                                    S: patternName,
                                },
                                commitId: {
                                    S: patternPublishItem.commitId.S as string,
                                },
                            },
                        }),
                    );
                }
            }

            console.log(
                `Deleted pattern's publish data from publish table. (${patternName})`,
            );
            // Delete metadata table
            await ddbClient.send(
                new DeleteItemCommand({
                    TableName: metaDataTableName,
                    Key: {
                        patternId: {
                            S: patternName,
                        },
                    },
                }),
            );
            console.log(
                `Deleted pattern's meta data from metadata table (${patternName})`,
            );
        }
    }
}

// Disassociate service catalog product from portfolio and delete
async function deleteServiceCatalogProduct(patternName: string): Promise<void> {
    const listCommandResponse = await scClient.send(new ListPortfoliosCommand({}));
    const portfolioResponse = listCommandResponse.PortfolioDetails?.find(
        (element) => element.DisplayName === 'PatternsPortfolio',
    );
    if (!portfolioResponse) {
        throw new Error(`Can't find portfolio PatternsPortfolio`);
    }
    const portfolioId = portfolioResponse.Id;

    const describeProductAsAdminResponse = await scClient.send(
        new DescribeProductAsAdminCommand({
            Name: `${patternName}_dynamodb`,
        }),
    );

    // Disassociate product from portfolio
    const productId =
        describeProductAsAdminResponse.ProductViewDetail?.ProductViewSummary?.ProductId;
    await scClient.send(
        new DisassociateProductFromPortfolioCommand({
            PortfolioId: portfolioId,
            ProductId: productId,
        }),
    );
    console.log(
        `Disassociated the product ${patternName}_dynamodb from portfolio. (PatternName: ${patternName})`,
    );
    // Delete product
    scClient.send(
        new DeleteProductCommand({
            Id: productId,
        }),
    );
    console.log(
        `Deleted the service catalog product ${patternName}_dynamodb. (PatternName: ${patternName})`,
    );
}

module.exports = defineConfig({
    env: {
        cognitoUsername: process.env.AWS_COGNITO_USERNAME,
        cognitoPassword: process.env.AWS_COGNITO_PASSWORD,
        cognitoDomain: process.env.AWS_COGNITO_DOMAIN,
        awsConfig: {
            aws_cognito_region: process.env.AWS_COGNITO_REGION,
            aws_user_pools_id: process.env.AWS_COGNITO_USER_POOLS_ID,
            aws_user_pools_web_client_id: process.env.AWS_COGNITO_USER_POOL_APP_CLIENT_ID,
        },
        githubBaseUrl: process.env.GITHUB_BASE_URL,
        githubOrg: process.env.GITHUB_ORG,
        githubToken: process.env.GITHUB_TOKEN,
        templateDir: 'cypress/fixtures/templaterepo',
    },
    e2e: {
        baseUrl: process.env.BASE_URL,
        viewportWidth: 1600,
        viewportHeight: 900,
        setupNodeEvents(on, config) {
            on('task', {
                async createDummyAttributesForTest({
                    attributeKey,
                    attributeValue,
                    attributeDescription,
                }) {
                    const ssmClient = new SSMClient({});
                    const ssmParamApoEndpoint = '/rapm/endpoints/AWSPattern';
                    const getParamResp = await ssmClient.send(
                        new GetParameterCommand({
                            Name: ssmParamApoEndpoint,
                        }),
                    );
                    const apoApiEndpoint = getParamResp.Parameter?.Value;

                    Amplify.configure(config.env.awsConfig);
                    const signIn = await Auth.signIn({
                        username: config.env.cognitoUsername,
                        password: config.env.cognitoPassword,
                    });
                    const accessToken = signIn.signInUserSession.idToken.jwtToken;
                    const body = JSON.stringify({
                        key: attributeKey,
                        value: attributeValue,
                        description: attributeDescription,
                        metadata: {},
                    });
                    await axios.post(`${apoApiEndpoint}attributes`, body, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });

                    return null;
                },
                async deleteDummyAttributesForTest({ attributeKey, attributeValue }) {
                    const ssmClient = new SSMClient({});
                    const ssmParamApoEndpoint = '/rapm/endpoints/AWSPattern';
                    const getParamResp = await ssmClient.send(
                        new GetParameterCommand({
                            Name: ssmParamApoEndpoint,
                        }),
                    );
                    const apoApiEndpoint = getParamResp.Parameter?.Value;

                    Amplify.configure(config.env.awsConfig);
                    const signIn = await Auth.signIn({
                        username: config.env.cognitoUsername,
                        password: config.env.cognitoPassword,
                    });
                    const accessToken = signIn.signInUserSession.idToken.jwtToken;
                    try {
                        await axios.delete(
                            `${apoApiEndpoint}attributes/${attributeKey}:${attributeValue}`,
                            {
                                headers: { Authorization: `Bearer ${accessToken}` },
                            },
                        );
                    } catch (e) {
                        console.log(
                            `attribute ${attributeKey}:${attributeValue} doesn't exist, hence ignoring delete`,
                        );
                    }
                    return null;
                },
                async commitAndPushToPatternRepo({ patternName, patternType }) {
                    process.env.GITHUB_ORG
                        ? await commitAndPushToGitHubPatternRepo(
                              patternName,
                              config.env.githubOrg,
                              config.env.templateDir,
                              config.env.githubBaseUrl,
                              config.env.githubToken,
                              patternType,
                          )
                        : await commitAndPushToCodeCommitPatternRepo(
                              patternName,
                              config.env.templateDir,
                              patternType,
                          );
                    return null;
                },
                async deletePattern({ patternName, patternType }) {
                    // Step 1. Delete artifact from ServiceCatalog/CodeArtifact
                    patternType.toUpperCase() === 'CFN'
                        ? await deleteServiceCatalogProduct(patternName)
                        : await deleteNpmPackagesFromCodeArtifact();
                    // Step 2. Delete pattern's cloudformation stack
                    await deletePatternStack(patternName);
                    // Step 3. Delete from DynamoDb
                    await deleteFromDynamoDbTable(patternName);
                    // Step 4. Delete code repo
                    config.env.githubOrg
                        ? await deleteGithubSourceCodeRepo(
                              config.env.githubBaseUrl,
                              config.env.githubToken,
                              config.env.githubOrg,
                              patternName,
                          )
                        : await deleteCodeCommmitSourceCodeRepo(patternName);
                    return null;
                },
            });
        },
    },
});

async function commitAndPushToGitHubPatternRepo(
    patternName: string,
    githubOrg: string,
    templateDir: string,
    githubBaseUrl: string,
    githubToken: string,
    patternType: string,
): Promise<null> {
    const repoName = patternName;
    const octokit = getOctokit(githubBaseUrl, githubToken);
    const maxRetries = 3;

    // 1. Get the last commit SHA of branch. Try 3 attempts.
    let retryGetlatestShaCount = 0;
    let retry = true;
    let latestSHAResp;
    do {
        try {
            latestSHAResp = await octokit.request(
                `GET /repos/${githubOrg}/${repoName}/branches/master`,
            );
            if (latestSHAResp.status >= 200 && latestSHAResp.status <= 299) {
                retry = false;
            } else {
                retryGetlatestShaCount++;
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        } catch (e) {
            console.error('Error when initializing repo, could not get latestSHA', e);
            retryGetlatestShaCount++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    } while (retry && retryGetlatestShaCount < maxRetries);

    if (!latestSHAResp) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw new Error(`Error when initializing repo, could not get latestSHA`);
    }
    const latestSHA = latestSHAResp.data.commit.sha;

    // 2. Create blob and tree
    const createTreeResp = await getGitTree(
        repoName,
        path.resolve(__dirname, `./${templateDir}/${patternType.toLowerCase()}`),
        latestSHA,
        githubBaseUrl,
        githubToken,
        githubOrg,
        templateDir,
    );

    // 3. Create the commit
    const createCommitResp = await octokit.request(
        `POST /repos/${githubOrg}/${repoName}/git/commits`,
        {
            accept: 'application/vnd.github.v3+json',
            message: 'feat: added packages',
            parents: [latestSHA],
            tree: createTreeResp.data.sha,
        },
    );

    // 4. Update the reference of your branch to point to the new commit SHA (on master branch example)
    await octokit.request(`POST /repos/${githubOrg}/${repoName}/git/refs/heads/master`, {
        accept: 'application/vnd.github.v3+json',
        ref: `refs/heads/master`,
        sha: createCommitResp.data.sha,
    });
    return null;
}

async function commitAndPushToCodeCommitPatternRepo(
    repoName: string,
    templateDir: string,
    patternType: string,
): Promise<void> {
    const branchName = 'master';
    const getBranchRes = await codeCommitClient.send(
        new GetBranchCommand({
            repositoryName: repoName,
            branchName,
        }),
    );
    // initialise repo
    const putFilesArr: PutFileEntry[] = [];
    const dirPath = path.resolve(
        __dirname,
        `./${templateDir}/${patternType.toLowerCase()}`,
    );
    buildPutFilesArr(patternType, templateDir, dirPath, branchName, putFilesArr);
    await codeCommitClient.send(
        new CreateCommitCommand({
            repositoryName: repoName,
            branchName: 'master',
            parentCommitId: getBranchRes.branch?.commitId,
            commitMessage: 'Initialise repository',
            putFiles: putFilesArr,
        }),
    );
}

function buildPutFilesArr(
    patternType: string,
    templateDir: string,
    dirPath: string,
    branchName: string,
    putFileEntryArr: PutFileEntry[],
): void {
    const list = fs.readdirSync(dirPath);
    for (const fname of list) {
        const file = `${dirPath}/${fname}`;
        const stat = fs.statSync(file);
        if (stat.isDirectory()) {
            /* Recurse into a subdirectory */
            buildPutFilesArr(patternType, templateDir, file, branchName, putFileEntryArr);
        } else {
            /* Is a file */
            const fileContent = fs.readFileSync(file).toString();
            const fileRelativePath = file.substring(
                path.resolve(__dirname, `./${templateDir}/${patternType.toLowerCase()}`)
                    .length + 1,
            );
            putFileEntryArr.push({
                filePath: fileRelativePath,
                fileContent: Buffer.from(fileContent),
            });
        }
    }
}

/**
 * Recursively scans the root template directory and creates and returns an array of GitTree objects
 * @returns Array of GitTree objects
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function createGitTreeArray(
    repoName: string,
    dirPath: string,
    githubBaseUrl: string,
    githubToken: string,
    githubOrg: string,
    templateDir: string,
    gitTreeArray?:
        | { path: unknown; mode: string; type: string; sha: unknown }[]
        | undefined,
) {
    if (!gitTreeArray) {
        gitTreeArray = [];
    }
    const list = fs.readdirSync(dirPath);

    for (const fname of list) {
        const file = `${dirPath}/${fname}`;
        const stat = fs.statSync(file);
        if (stat.isDirectory()) {
            /* Recurse into a subdirectory */
            await createGitTreeArray(
                repoName,
                file,
                githubBaseUrl,
                githubToken,
                githubOrg,
                templateDir,
                gitTreeArray,
            );
        } else {
            /* Is a file */
            const treeObjForCommit = await getTreeObjectForCommit(
                repoName,
                file,
                githubBaseUrl,
                githubToken,
                githubOrg,
                templateDir,
            );
            gitTreeArray.push(treeObjForCommit);
        }
    }

    return gitTreeArray;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function getGitTree(
    repoName: string,
    dirPath: string,
    latestSHA: string,
    githubBaseUrl: string,
    githubToken: string,
    githubOrg: string,
    templateDir: string,
) {
    const octokit = getOctokit(githubBaseUrl, githubToken);
    const tree = await createGitTreeArray(
        repoName,
        dirPath,
        githubBaseUrl,
        githubToken,
        githubOrg,
        templateDir,
    );
    return octokit.request(`POST /repos/${githubOrg}/${repoName}/git/trees`, {
        accept: 'application/vnd.github.v3+json',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        base_tree: latestSHA,
        tree,
    });
}

/**
 * Creates Tree Object for a file for commit
 */
async function getTreeObjectForCommit(
    repoName: string,
    filePath: string,
    githubBaseUrl: string,
    githubToken: string,
    githubOrg: string,
    templateDir: string,
): Promise<{
    path: string;
    mode: string;
    type: string;
    sha: string;
}> {
    const octokit = getOctokit(githubBaseUrl, githubToken);
    const content = fs.readFileSync(filePath).toString();
    const createBlob = await octokit.request(
        `POST /repos/${githubOrg}/${repoName}/git/blobs`,
        {
            accept: 'application/vnd.github.v3+json',
            content,
            encoding: 'utf-8',
        },
    );
    const relativePathFromRoot = getRelativePathFromRoot(filePath, templateDir);
    return getTreeObject(relativePathFromRoot, createBlob.data.sha);
}

function getRelativePathFromRoot(filePath: string, templateDir: string): string {
    const templateRootDir = `/${templateDir}`;
    return filePath.substring(
        filePath.lastIndexOf(templateRootDir) + templateRootDir.length + 5,
    );
}

/**
 * Creates a tree object for doing the initial commit to initialise the repo
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getTreeObject(
    filePath: string,
    sha: string,
): {
    path: string;
    mode: string;
    type: string;
    sha: string;
} {
    return {
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha,
    };
}

/**
 * @returns Octokit client
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getOctokit(githubBaseUrl: string, githubToken: string) {
    githubBaseUrl = githubBaseUrl
        ? `${githubBaseUrl.replace(/[/\\]+$/, '')}/api/v3`
        : 'https://api.github.com';
    return new octokit.Octokit({
        auth: githubToken,
        baseUrl: githubBaseUrl,
    });
}
