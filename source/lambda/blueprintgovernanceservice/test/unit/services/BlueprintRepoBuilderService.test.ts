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
/* eslint-disable @typescript-eslint/no-unused-vars */

import 'reflect-metadata';
import { mock, reset } from 'ts-mockito';
import { when } from 'jest-when';
import { BlueprintRepoBuilderService } from '../../../src/service/BlueprintRepoBuilderService';
import { DependencyConfigurationProvider } from '../../../src/common/providers/DependencyConfigurationProvider';
import { StaticLoggerFactory } from '../../../src/common/logging';
import BlueprintError from '../../../src/common/BlueprintError';
import path from 'path';

const mockRequestFunc = jest.fn();
jest.mock('@octokit/rest', () => ({
    Octokit: jest.fn(() => ({
        request: mockRequestFunc,
    })),
}));

const repo = {
    id: 1296269,
    node_id: 'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
    name: 'Hello-World',
    full_name: 'octocat/Hello-World',
    owner: 'oco',
    private: false,
    homepage: 'https://github.com',
    organization: 'octocat',
    language: null,
    forks: 9,
    forks_count: 9,
    stargazers_count: 80,
    watchers_count: 80,
    watchers: 80,
    size: 108,
    default_branch: 'master',
    open_issues: 0,
    open_issues_count: 0,
    is_template: true,
    license: {
        key: 'mit',
        name: 'MIT License',
        url: 'https://api.github.com/licenses/mit',
        spdx_id: 'MIT',
        node_id: 'MDc6TGljZW5zZW1pdA==',
        html_url: 'https://api.github.com/licenses/mit',
    },
    topics: ['octocat', 'atom', 'electron', 'api'],
    has_issues: true,
    has_projects: true,
    has_wiki: true,
    has_pages: false,
    has_downloads: true,
    archived: false,
    disabled: false,
    visibility: 'public',
    pushed_at: '2011-01-26T19:06:43Z',
    created_at: '2011-01-26T19:01:12Z',
    updated_at: '2011-01-26T19:14:43Z',
    permissions: {
        admin: false,
        push: false,
        pull: true,
    },
    allow_rebase_merge: true,
    template_repository: null,
    temp_clone_token: 'ABTLWHOULUVAXGTRYU7OC2876QJ2O',
    allow_squash_merge: true,
    allow_auto_merge: false,
    delete_branch_on_merge: true,
    allow_merge_commit: true,
    subscribers_count: 42,
    network_count: 0,
};

const fixtureGitTreeArray = [
    { mode: '100644', path: '.gitignore', sha: 'sha-abc', type: 'blob' },
    { mode: '100644', path: 'images/.gitkeep', sha: 'sha-abc', type: 'blob' },
    { mode: '100644', path: 'lerna.json', sha: 'sha-abc', type: 'blob' },
    { mode: '100644', path: 'package.json', sha: 'sha-abc', type: 'blob' },
    {
        mode: '100644',
        path: 'packages/cdk-test-app/.npmignore',
        sha: 'sha-abc',
        type: 'blob',
    },
    {
        mode: '100644',
        path: 'packages/cdk-test-app/bin/cdk-test-app.ts',
        sha: 'sha-abc',
        type: 'blob',
    },
    {
        mode: '100644',
        path: 'packages/cdk-test-app/cdk.json',
        sha: 'sha-abc',
        type: 'blob',
    },
    {
        mode: '100644',
        path: 'packages/cdk-test-app/package.json',
        sha: 'sha-abc',
        type: 'blob',
    },
    {
        mode: '100644',
        path: 'packages/cdk-test-app/tsconfig.json',
        sha: 'sha-abc',
        type: 'blob',
    },
];

describe('test BlueprintRepoBuilderService', () => {
    const dependencyConfigurationProvider = mock(DependencyConfigurationProvider);
    const dependencyConfigurationProviderHandle = jest.fn();
    dependencyConfigurationProvider.getBlueprintServiceRepoCredentials =
        dependencyConfigurationProviderHandle;
    dependencyConfigurationProviderHandle.mockReturnValue('MockToken');

    const branch = 'testBranch';
    const ROOT_INITIAL_REPO_DIR = 'initialRepoTemplates';

    beforeAll(() => {
        process.env.GITHUB_ORGANIZATION = 'octocat';
        process.env.GITHUB_URL = 'httpt://testurl';
    });

    beforeEach(() => {
        reset();
        mockRequestFunc.mockClear();
    });

    test('test createRepo error flow', async () => {
        mockRequestFunc.mockRejectedValueOnce('test err in creating repo');
        const objectUnderTest = new BlueprintRepoBuilderService(
            new StaticLoggerFactory(),
            dependencyConfigurationProvider
        );
        await expect(objectUnderTest.createRepo('repo')).rejects.toEqual(
            new BlueprintError(`Error in creating a repo`, 500)
        );
    });

    test('github url having trailing slash should be removed', () => {
        process.env.GITHUB_URL = 'http://testurl/';
        let objectUnderTest = new BlueprintRepoBuilderService(
            new StaticLoggerFactory(),
            dependencyConfigurationProvider
        );
        expect(objectUnderTest.apiBaseUrl).toBe('http://testurl/api/v3');

        process.env.GITHUB_URL = 'http://testgithuburl\\';
        objectUnderTest = new BlueprintRepoBuilderService(
            new StaticLoggerFactory(),
            dependencyConfigurationProvider
        );
        expect(objectUnderTest.apiBaseUrl).toBe('http://testgithuburl/api/v3');

        process.env.GITHUB_URL = 'http://testgithuburl';
        objectUnderTest = new BlueprintRepoBuilderService(
            new StaticLoggerFactory(),
            dependencyConfigurationProvider
        );
        expect(objectUnderTest.apiBaseUrl).toBe('http://testgithuburl/api/v3');
    });

    test('test createRepo', async () => {
        const objectUnderTest = new BlueprintRepoBuilderService(
            new StaticLoggerFactory(),
            dependencyConfigurationProvider
        );
        mockRequestFunc.mockResolvedValue(true);
        await objectUnderTest.createRepo(repo.name);
        expect(mockRequestFunc).toHaveBeenCalledWith(
            `POST /orgs/${repo.organization}/repos`,
            {
                accept: 'application/vnd.github.v3+json',
                name: repo.name,
                private: true,
                is_template: true,
                auto_init: true,
            }
        );
    });

    test('test createGitTreeArray', async () => {
        const objectUnderTest = new BlueprintRepoBuilderService(
            new StaticLoggerFactory(),
            dependencyConfigurationProvider
        );
        when(mockRequestFunc)
            .calledWith(
                `POST /repos/${repo.organization}/${repo.name}/git/blobs`,
                expect.anything()
            )
            .mockResolvedValue({
                data: {
                    sha: 'sha-abc',
                },
            });

        const gitTreeArray = await objectUnderTest.createGitTreeArray(
            repo.name,
            path.resolve(
                __dirname,
                `../../../${ROOT_INITIAL_REPO_DIR}/${'cdk'.toLowerCase()}`
            ),
            branch
        );
        expect(gitTreeArray).toEqual(
            expect.arrayContaining(
                fixtureGitTreeArray.map((p) =>
                    expect.objectContaining({
                        mode: p.mode,
                        path: expect.stringContaining(p.path),
                        type: p.type,
                        sha: p.sha,
                    })
                )
            )
        );
    });

    test('test getGitTree', async () => {
        const objectUnderTest = new BlueprintRepoBuilderService(
            new StaticLoggerFactory(),
            dependencyConfigurationProvider
        );
        when(mockRequestFunc)
            .calledWith(
                `POST /repos/${repo.organization}/${repo.name}/git/blobs`,
                expect.anything()
            )
            .mockResolvedValue({
                data: {
                    sha: 'sha-abc',
                },
            });

        await objectUnderTest.getGitTree(
            repo.name,
            path.resolve(
                __dirname,
                `../../../${ROOT_INITIAL_REPO_DIR}/${'cdk'.toLowerCase()}`
            ),
            'latest-sha-test',
            branch
        );
        expect(mockRequestFunc).toHaveBeenLastCalledWith(
            `POST /repos/${repo.organization}/${repo.name}/git/trees`,
            {
                accept: 'application/vnd.github.v3+json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                base_tree: 'latest-sha-test',
                tree: expect.anything(),
            }
        );
    });

    test('test initialiseRepo', async () => {
        const objectUnderTest = new BlueprintRepoBuilderService(
            new StaticLoggerFactory(),
            dependencyConfigurationProvider
        );
        when(mockRequestFunc)
            .calledWith(`GET /repos/${repo.organization}/${repo.name}/branches/${branch}`)
            .mockResolvedValue({
                data: {
                    commit: {
                        sha: 'sha-xyz',
                    },
                },
            });
        when(mockRequestFunc)
            .calledWith(
                `POST /repos/${repo.organization}/${repo.name}/git/commits`,
                expect.anything()
            )
            .mockResolvedValue({
                data: {
                    sha: 'sha-abc',
                },
            });
        objectUnderTest.getGitTree = jest.fn().mockResolvedValue({
            data: {
                sha: 'sha-xyz',
            },
        });
        await objectUnderTest.initializeRepo(branch, repo.name, 'CDK');
        expect(mockRequestFunc).toHaveBeenLastCalledWith(
            `POST /repos/${repo.organization}/${repo.name}/git/refs/heads/${branch}`,
            {
                accept: 'application/vnd.github.v3+json',
                ref: `refs/heads/${branch}`,
                sha: 'sha-abc',
            }
        );
    });

    test('test enableBranchProtection', async () => {
        const objectUnderTest = new BlueprintRepoBuilderService(
            new StaticLoggerFactory(),
            dependencyConfigurationProvider
        );
        await objectUnderTest.enableBranchProtection(repo.owner, repo.name, branch);
        expect(mockRequestFunc).toBeCalledWith(
            `PUT /repos/${repo.owner}/${repo.name}/branches/${branch}/protection`,
            {
                accept: 'application/vnd.github.v3+json',
                enforce_admins: null,
                required_pull_request_reviews: {
                    dismiss_stale_reviews: false,
                    dismissal_restrictions: {},
                    require_code_owner_reviews: true,
                },
                required_status_checks: null,
                restrictions: null,
            }
        );
    });

    test('test addCodeowners', async () => {
        const objectUnderTest = new BlueprintRepoBuilderService(
            new StaticLoggerFactory(),
            dependencyConfigurationProvider
        );
        await objectUnderTest.addCodeowners(repo.owner, repo.name, ['testuser1']);
        expect(mockRequestFunc).toBeCalledWith(
            `PUT /repos/${repo.owner}/${repo.name}/contents/CODEOWNERS`,
            {
                accept: 'application/vnd.github.v3+json',
                message: 'Add CODEOWNERS',
                content: Buffer.from('* testuser1').toString('base64'),
            }
        );
    });
});
