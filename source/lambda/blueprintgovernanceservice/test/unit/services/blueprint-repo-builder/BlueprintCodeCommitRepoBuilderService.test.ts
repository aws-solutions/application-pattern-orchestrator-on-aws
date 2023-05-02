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

import 'reflect-metadata';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import {
    CreateRepositoryCommand,
    CodeCommitClient,
    GetBranchCommand,
    CreateCommitCommand,
    DeleteRepositoryCommand,
} from '@aws-sdk/client-codecommit';
import { BlueprintCodeCommitRepoBuilderService } from '../../../../src/service/blueprint-repo-builder/BlueprintCodeCommitRepoBuilderService';
import { StaticLoggerFactory } from '../../../../src/common/logging/logger-factory';
import BlueprintError from '../../../../src/common/BlueprintError';
import path from 'path';

jest.mock('path', () => ({
    ...jest.requireActual('path'),
    resolve: jest
        .fn()
        .mockImplementationOnce(() =>
            path.join(__dirname, '../../../../initialRepoTemplates/cfn/images')
        )
        .mockImplementationOnce(() =>
            path.join(__dirname, '../../../../initialRepoTemplates/cfn/images/.gitkeep')
        ),
}));

describe('test BlueprintCodeCommitRepoBuilderService', () => {
    const repositoryName = 'testRepoName';
    const cloneUrlHttp = 'https://repoCloneUrl';
    const codeCommitMockClient = mockClient(CodeCommitClient);

    beforeEach(() => {
        codeCommitMockClient.reset();
    });

    test('test success flow', async () => {
        codeCommitMockClient.on(CreateRepositoryCommand).resolves({
            $metadata: {
                httpStatusCode: 200,
            },
            repositoryMetadata: {
                cloneUrlHttp,
                repositoryName,
            },
        });
        codeCommitMockClient.on(GetBranchCommand).resolves({
            branch: {
                commitId: '123',
            },
        });
        const objectUnderTest = new BlueprintCodeCommitRepoBuilderService(
            new StaticLoggerFactory(),
            codeCommitMockClient as unknown as CodeCommitClient
        );
        const response = await objectUnderTest.createAndInitializeRepo(
            repositoryName,
            'CFN'
        );
        expect(response.branchName).toBe('master');
        expect(response.patternRepoURL).toBe(cloneUrlHttp);
        expect(response.repoName).toBe(repositoryName);
        expect(response.repoOwner).toBeUndefined();
    });

    test('Create repo throws error', async () => {
        codeCommitMockClient.on(CreateRepositoryCommand).rejects('error creating repo');
        const objectUnderTest = new BlueprintCodeCommitRepoBuilderService(
            new StaticLoggerFactory(),
            codeCommitMockClient as unknown as CodeCommitClient
        );

        await expect(
            objectUnderTest.createAndInitializeRepo(repositoryName, 'CFN')
        ).rejects.toBeInstanceOf(BlueprintError);
    });

    test('Create repo returns unsuccessful response', async () => {
        codeCommitMockClient.on(CreateRepositoryCommand).resolves({
            $metadata: {
                httpStatusCode: 500,
            },
        });
        const objectUnderTest = new BlueprintCodeCommitRepoBuilderService(
            new StaticLoggerFactory(),
            codeCommitMockClient as unknown as CodeCommitClient
        );

        await expect(
            objectUnderTest.createAndInitializeRepo(repositoryName, 'CFN')
        ).rejects.toBeInstanceOf(BlueprintError);
    });

    test('error in initialise repo should rollback repo creation', async () => {
        codeCommitMockClient.on(CreateRepositoryCommand).resolves({
            $metadata: {
                httpStatusCode: 200,
            },
            repositoryMetadata: {
                cloneUrlHttp,
                repositoryName,
            },
        });
        codeCommitMockClient.on(GetBranchCommand).resolves({
            branch: {
                commitId: '123',
            },
        });
        codeCommitMockClient
            .on(CreateCommitCommand)
            .rejects('error creating initial commit');
        const objectUnderTest = new BlueprintCodeCommitRepoBuilderService(
            new StaticLoggerFactory(),
            codeCommitMockClient as unknown as CodeCommitClient
        );
        await expect(
            objectUnderTest.createAndInitializeRepo(repositoryName, 'CFN')
        ).rejects.toBeInstanceOf(BlueprintError);
        expect(codeCommitMockClient).toHaveReceivedCommand(DeleteRepositoryCommand);
    });
});
