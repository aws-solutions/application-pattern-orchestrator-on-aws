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
import {
    CodeCommitClient,
    CreateCommitCommand,
    CreateRepositoryCommand,
    CreateRepositoryCommandOutput,
    DeleteRepositoryCommand,
    GetBranchCommand,
    PutFileCommand,
    PutFileEntry,
} from '@aws-sdk/client-codecommit';
import fs from 'fs';
import path from 'path';
import * as handlebars from 'handlebars';
import { PatternType } from '../../common/common-types';
import {
    IBlueprintRepoBuilderService,
    blueprintRepoBuilderServiceConstants,
} from './IBlueprintRepoBuilderService';
import { inject, injectable } from 'tsyringe';
import { LoggerFactory } from '../../common/logging';
import { Logger } from 'aws-xray-sdk';
import BlueprintError from '../../common/BlueprintError';
import { BlueprintCodeRepoDetails } from '../../types/BlueprintType';
// codecommit by default creates the default branch as master and doesn't provide option to
// specify a different name when creating a repo
const defaultBranchName = 'master';

@injectable()
export class BlueprintCodeCommitRepoBuilderService
    implements IBlueprintRepoBuilderService
{
    private readonly logger: Logger;
    private readonly codeCommitClient: CodeCommitClient;
    public constructor(
        @inject('LoggerFactory') loggerFactory: LoggerFactory,
        @inject('CodeCommitClient') codeCommitClient: CodeCommitClient
    ) {
        this.logger = loggerFactory.getLogger('BlueprintRepoBuilderService');
        this.codeCommitClient = codeCommitClient;
    }

    public async deleteRepo(repoName: string): Promise<void> {
        this.logger.debug(`Deleting the repo ${repoName}`);
        try {
            await this.codeCommitClient.send(
                new DeleteRepositoryCommand({
                    repositoryName: repoName,
                })
            );
        } catch (e) {
            this.logger.error(
                `Unable to delete the repo: ${repoName}: ${JSON.stringify(e, null, 4)}`
            );
            throw e;
        }
    }
    public async createAndInitializeRepo(
        repoName: string,
        patternType: PatternType
    ): Promise<BlueprintCodeRepoDetails> {
        // Create repo
        let createRepoResponse: CreateRepositoryCommandOutput;
        try {
            createRepoResponse = await this.codeCommitClient.send(
                new CreateRepositoryCommand({
                    repositoryName: repoName,
                })
            );
        } catch (e) {
            this.logger.error(
                `Error creating repo: ${repoName}, ${JSON.stringify(e, null, 4)}`
            );
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BlueprintError(`Error creating repo: ${repoName}`, 500);
        }
        if (
            createRepoResponse.$metadata.httpStatusCode == 200 &&
            createRepoResponse.repositoryMetadata &&
            createRepoResponse.repositoryMetadata.cloneUrlHttp &&
            createRepoResponse.repositoryMetadata.repositoryName
        ) {
            this.logger.debug(
                `Create Repo Response: ${JSON.stringify(createRepoResponse, null, 4)}`
            );

            // initialise repo
            try {
                await this.initialiseRepo(repoName, patternType);
            } catch (e) {
                this.logger.error(
                    `Error initialising repo: ${repoName}: ${JSON.stringify(e, null, 4)}`
                );
                // rollback the repo creation
                await this.deleteRepo(repoName);
                // eslint-disable-next-line @typescript-eslint/no-throw-literal
                throw new BlueprintError(`Error initialising repo: ${repoName}`, 500);
            }
            return {
                patternRepoURL: createRepoResponse.repositoryMetadata.cloneUrlHttp,
                repoName: createRepoResponse.repositoryMetadata.repositoryName,
                // codecommit by default creates the default branch as master and doesn't provide option to
                // specify a different name when creating a repo. The create repo response also doesn't have the name of the default branch
                branchName: 'master',
            };
        } else {
            this.logger.error(
                `Repo details not returned from create repo API: ${repoName}`
            );
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BlueprintError(
                `Repo details not returned from create repo API: ${repoName}`,
                500
            );
        }
    }

    private async initialiseRepo(
        repoName: string,
        patternType: PatternType
    ): Promise<void> {
        // first commit having readme file
        await this.codeCommitClient.send(
            new PutFileCommand({
                repositoryName: repoName,
                branchName: defaultBranchName,
                filePath: 'README.md',
                fileContent: Buffer.from(`# ${repoName}`),
            })
        );
        const getBranchRes = await this.codeCommitClient.send(
            new GetBranchCommand({
                repositoryName: repoName,
                branchName: defaultBranchName,
            })
        );
        // initialise repo
        const putFilesArr: PutFileEntry[] = [];
        const dirPath = path.resolve(
            __dirname,
            blueprintRepoBuilderServiceConstants.rootInitialRepoDir,
            patternType.toLowerCase()
        );
        this.buildPutFilesArr(patternType, dirPath, defaultBranchName, putFilesArr);
        await this.codeCommitClient.send(
            new CreateCommitCommand({
                repositoryName: repoName,
                branchName: defaultBranchName,
                parentCommitId: getBranchRes.branch?.commitId,
                commitMessage: 'Initialise repository',
                putFiles: putFilesArr,
            })
        );
    }

    private buildPutFilesArr(
        patternType: PatternType,
        dirPath: string,
        branchName: string,
        putFileEntryArr: PutFileEntry[]
    ): void {
        const list = fs.readdirSync(dirPath);
        for (const fname of list) {
            const file = `${dirPath}/${fname}`;
            const stat = fs.statSync(file);
            if (stat.isDirectory()) {
                /* Recurse into a subdirectory */
                this.buildPutFilesArr(patternType, file, branchName, putFileEntryArr);
            } else {
                /* Is a file */
                const template = handlebars.compile(
                    fs.existsSync(file) ? fs.readFileSync(file).toString() : ''
                );
                const fileContent = template({ branchName });
                const fileRelativePath = file.substring(
                    path.resolve(
                        __dirname,
                        blueprintRepoBuilderServiceConstants.rootInitialRepoDir,
                        patternType.toLowerCase()
                    ).length + 1
                );
                putFileEntryArr.push({
                    filePath: fileRelativePath,
                    fileContent: Buffer.from(fileContent),
                });
            }
        }
    }
}
