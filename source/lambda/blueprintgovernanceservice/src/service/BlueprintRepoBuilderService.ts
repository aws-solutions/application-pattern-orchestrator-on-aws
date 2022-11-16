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
import { inject, injectable } from 'tsyringe';
import { LoggerFactory } from '../common/logging';
import { Logger } from 'aws-xray-sdk';
import BlueprintError from '../common/BlueprintError';
import { PatternType } from '../common/common-types';
import { GitTree } from '../types/BlueprintType';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as fs from 'fs';
import { Octokit } from '@octokit/rest';
import { DependencyConfigurationProvider } from '../common/providers/DependencyConfigurationProvider';

const ROOT_INITIAL_REPO_DIR = 'initialRepoTemplates';

@injectable()
export class BlueprintRepoBuilderService {
    private readonly logger: Logger;
    private readonly org: string;
    public readonly apiBaseUrl: string;

    /**
     * Creates an instance of blueprint repo builder service.
     * @param loggerFactory
     * @param client
     * @param applicationConfig
     * @param dependencyConfigurationProvider
     */
    public constructor(
        @inject('LoggerFactory') loggerFactory: LoggerFactory,
        @inject('DependencyConfigurationProvider')
        private readonly dependencyConfigurationProvider: DependencyConfigurationProvider
    ) {
        this.logger = loggerFactory.getLogger('BlueprintRepoBuilderService');
        const gitHubUrl = process.env.GITHUB_URL;
        // remove any trailing slash from the GitHub url
        this.apiBaseUrl = gitHubUrl
            ? `${gitHubUrl.replace(/[/\\]+$/, '')}/api/v3`
            : 'https://api.github.com';
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.org = process.env.GITHUB_ORGANIZATION!;
    }

    /**
     * Gets blueprint github token
     * @returns blueprint github token
     */
    private async getBlueprintGithubToken(): Promise<string> {
        this.logger.info('getBlueprintGithubToken');
        return this.dependencyConfigurationProvider.getBlueprintServiceRepoCredentials(
            'BLUEPRINTGOVERNANCE'
        );
    }

    /**
     * @returns Octokit client
     */
    private async getOctokit(): Promise<Octokit> {
        return new Octokit({
            auth: await this.getBlueprintGithubToken(),
            baseUrl: this.apiBaseUrl,
        });
    }

    /**
     * Creates repo
     * @param reponame
     * @returns repo
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async createRepo(reponame: string): Promise<any> {
        try {
            const octokit = await this.getOctokit();
            this.logger.info(`org:${this.org}`);
            if (this.org) {
                return await octokit.request(`POST /orgs/${this.org}/repos`, {
                    accept: 'application/vnd.github.v3+json',
                    name: reponame,
                    private: true,
                    is_template: true,
                    auto_init: true,
                });
            } else {
                this.logger.error('GitHub Organization not supplied');
                // eslint-disable-next-line @typescript-eslint/no-throw-literal
                throw new BlueprintError(`GitHub Organization not supplied`, 400);
            }
        } catch (e) {
            this.logger.error(`Error in creating Repo: ${JSON.stringify(e)}`);
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BlueprintError(`Error in creating a repo`, 500);
        }
    }

    /**
     * Pre-initialises the repo with a skeleton structure for both CDK and CFN based repos
     * @param branch
     * @param patternType
     */
    /**
     * Initialises the repo with required files structure
     * @param branch
     * @param repoName
     * @param patternType
     */
    public async initializeRepo(
        branch: string,
        repoName: string,
        patternType: PatternType
    ): Promise<void> {
        const octokit = await this.getOctokit();
        const maxRetries = 3;

        // 1. Get the last commit SHA of branch. Try 3 attempts.
        let retryGetlatestShaCount = 0;
        let retry = true;
        let latestSHAResp;
        do {
            try {
                this.logger.debug('Attempt: ' + retryGetlatestShaCount);
                latestSHAResp = await octokit.request(
                    `GET /repos/${this.org}/${repoName}/branches/${branch}`
                );
                if (latestSHAResp.status >= 200 && latestSHAResp.status <= 299) {
                    retry = false;
                } else {
                    retryGetlatestShaCount++;
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            } catch (e) {
                this.logger.error(
                    'Error when initializing repo, could not get latestSHA',
                    e
                );
                retryGetlatestShaCount++;
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        } while (retry && retryGetlatestShaCount < maxRetries);

        if (!latestSHAResp) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BlueprintError(
                `Error when initializing repo, could not get latestSHA`,
                500
            );
        }
        const latestSHA = latestSHAResp.data.commit.sha;

        // 2. Create blob and tree
        const createTreeResp = await this.getGitTree(
            repoName,
            path.resolve(
                __dirname,
                `./${ROOT_INITIAL_REPO_DIR}/${patternType.toLowerCase()}`
            ),
            latestSHA,
            branch
        );

        // 3. Create the commit
        const createCommitResp = await octokit.request(
            `POST /repos/${this.org}/${repoName}/git/commits`,
            {
                accept: 'application/vnd.github.v3+json',
                message: 'chore: initial repo setup',
                parents: [latestSHA],
                tree: createTreeResp.data.sha,
            }
        );

        // 4. Update the reference of your branch to point to the new commit SHA (on master branch example)
        await octokit.request(
            `POST /repos/${this.org}/${repoName}/git/refs/heads/${branch}`,
            {
                accept: 'application/vnd.github.v3+json',
                ref: `refs/heads/${branch}`,
                sha: createCommitResp.data.sha,
            }
        );
    }

    /**
     * Returns a git tree object
     */
    public async getGitTree(
        repoName: string,
        dirPath: string,
        latestSHA: string,
        branchName: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any> {
        const octokit = await this.getOctokit();
        const tree = await this.createGitTreeArray(repoName, dirPath, branchName);
        return octokit.request(`POST /repos/${this.org}/${repoName}/git/trees`, {
            accept: 'application/vnd.github.v3+json',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            base_tree: latestSHA,
            tree,
        });
    }

    /**
     * Recursively scans the root template directory and creates and returns an array of GitTree objects
     * @param repoName : Name of the repo
     * @param dirPath : Directory from where to recurse down
     * @param branchName : Main branch of repo
     * @param gitTreeArray
     * @returns Array of GitTree objects
     */
    public async createGitTreeArray(
        repoName: string,
        dirPath: string,
        branchName: string,
        gitTreeArray?: GitTree[]
    ): Promise<GitTree[]> {
        if (!gitTreeArray) {
            gitTreeArray = [];
        }
        const list = fs.readdirSync(dirPath);

        for (const fname of list) {
            const file = `${dirPath}/${fname}`;
            const stat = fs.statSync(file);
            if (stat.isDirectory()) {
                /* Recurse into a subdirectory */
                await this.createGitTreeArray(repoName, file, branchName, gitTreeArray);
            } else {
                /* Is a file */
                const treeObjForCommit = await this.getTreeObjectForCommit(
                    repoName,
                    file,
                    branchName
                );
                gitTreeArray.push(treeObjForCommit);
            }
        }

        return gitTreeArray;
    }

    /**
     * Creates Tree Object for a file for commit
     */
    private async getTreeObjectForCommit(
        repoName: string,
        filePath: string,
        branchName: string
    ): Promise<GitTree> {
        const octokit = await this.getOctokit();
        const template = handlebars.compile(
            fs.existsSync(filePath) ? fs.readFileSync(filePath).toString() : ''
        );
        const content = template({ branchName });
        const createBlob = await octokit.request(
            `POST /repos/${this.org}/${repoName}/git/blobs`,
            {
                accept: 'application/vnd.github.v3+json',
                content,
                encoding: 'utf-8',
            }
        );
        const relativePathFromRoot = this.getRelativePathFromRoot(filePath);
        return this.getTreeObject(relativePathFromRoot, createBlob.data.sha);
    }

    private getRelativePathFromRoot(filePath: string): string {
        const templateRootDir = `/${ROOT_INITIAL_REPO_DIR}`;
        return filePath.substring(
            filePath.lastIndexOf(templateRootDir) + templateRootDir.length + 5
        );
    }

    /**
     * Creates a tree object for doing the initial commit to initialise the repo
     */
    private getTreeObject(filePath: string, sha: string): GitTree {
        return {
            path: filePath,
            mode: '100644',
            type: 'blob',
            sha,
        };
    }

    /**
     * Enable branch protection
     * @param repoOwner
     * @param repoName
     * @param branchName
     * @returns response
     */
    public async enableBranchProtection(
        repoOwner: string,
        repoName: string,
        branchName: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any> {
        try {
            const octokit = await this.getOctokit();
            return await octokit.request(
                `PUT /repos/${repoOwner}/${repoName}/branches/${branchName}/protection`,
                {
                    accept: 'application/vnd.github.v3+json',
                    // Let users merge to the branch even when a status check failed
                    required_status_checks: null,
                    // Let admin merge to the branch without review from a CODEOWNER
                    enforce_admins: null,
                    required_pull_request_reviews: {
                        dismissal_restrictions: {},
                        dismiss_stale_reviews: false,
                        // Require a review from a CODEOWNER
                        require_code_owner_reviews: true,
                    },
                    // Let anyone push to the protected branch
                    restrictions: null,
                }
            );
        } catch (e) {
            this.logger.error('Error when enabling branch protection', e);
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BlueprintError(`Error when enabling branch protection`, 500);
        }
    }

    /**
     *
     * @param repoOwner
     * @param repoName
     * @param codeowners List of codeowner aliases
     * @returns
     */
    public async addCodeowners(
        repoOwner: string,
        repoName: string,
        codeowners: string[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any> {
        try {
            const octokit = await this.getOctokit();
            const codeOwnersContent = `* ${codeowners.join(' ')}`;

            return await octokit.request(
                `PUT /repos/${repoOwner}/${repoName}/contents/CODEOWNERS`,
                {
                    accept: 'application/vnd.github.v3+json',
                    message: 'Add CODEOWNERS',
                    content: Buffer.from(codeOwnersContent).toString('base64'),
                }
            );
        } catch (e) {
            this.logger.error('Error when adding codeowners', e);
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BlueprintError(`Error when adding codeowners`, 500);
        }
    }
}
