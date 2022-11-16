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
import { handler } from '../../../lambda/github/createWebhook';
import { mockClient } from 'aws-sdk-client-mock';
import {
    CodeBuildClient,
    CreateWebhookCommand,
    DeleteWebhookCommand,
} from '@aws-sdk/client-codebuild';
import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { CloudFormationCustomResourceEvent } from 'aws-lambda';

process.env.GITHUB_TOKEN_SECRET_ID = 'GITHUB_TOKEN_SECRET_ID';
process.env.GITHUB_URL = 'https://github.com';
process.env.GITHUB_REPO_OWNER = 'repoOwner';
process.env.GITHUB_REPO_NAME = 'repoName';

const mockGithubRequest = jest.fn();
jest.mock('@octokit/rest', () => {
    return {
        Octokit: jest.fn().mockImplementation(() => {
            return { request: mockGithubRequest };
        }),
    };
});

const cbMock = mockClient(CodeBuildClient);

const smMock = mockClient(SecretsManagerClient);

smMock.on(GetSecretValueCommand).resolves({ SecretString: 'abc' });

beforeEach(() => {
    mockGithubRequest.mockReset();
    cbMock.reset();
});

describe('Create Codebuild Github webhook handler tests', () => {
    test('Create a github webhook for the given project', async () => {
        cbMock.on(CreateWebhookCommand).resolves({
            webhook: {
                payloadUrl: 'payloadUrl',
                secret: 'secret',
            },
        });
        await handler({
            RequestType: 'Create',
            ResourceProperties: {
                PROJECT_NAME: 'codeBuildProject',
            },
        } as unknown as CloudFormationCustomResourceEvent);
        expect(cbMock.calls()).toHaveLength(1);
        expect(cbMock.call(0).firstArg).toBeInstanceOf(CreateWebhookCommand);
        expect(mockGithubRequest).toBeCalled();
        expect(mockGithubRequest).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                config: {
                    content_type: 'json',
                    secret: 'secret',
                    url: 'payloadUrl',
                },
            })
        );
    });

    test('Cleanup codebuild webhook when a github webhook creation fails', async () => {
        mockGithubRequest.mockRejectedValue('test error');
        cbMock.on(CreateWebhookCommand).resolves({
            webhook: {
                payloadUrl: 'payloadUrl',
                secret: 'secret',
            },
        });
        await expect(
            handler({
                RequestType: 'Create',
                ResourceProperties: {
                    PROJECT_NAME: 'codeBuildProject',
                },
            } as unknown as CloudFormationCustomResourceEvent)
        ).rejects.toThrow();
        expect(cbMock.calls()).toHaveLength(2);
        expect(cbMock.call(0).firstArg).toBeInstanceOf(CreateWebhookCommand);
        expect(cbMock.call(1).firstArg).toBeInstanceOf(DeleteWebhookCommand);
    });

    test('Delete a github webhook for the given project', async () => {
        cbMock.on(DeleteWebhookCommand).resolves({});
        await handler({
            RequestType: 'Delete',
            ResourceProperties: {
                PROJECT_NAME: 'codeBuildProject',
            },
        } as unknown as CloudFormationCustomResourceEvent);
        expect(cbMock.calls()).toHaveLength(1);
        expect(cbMock.call(0).firstArg).toBeInstanceOf(DeleteWebhookCommand);
    });
});
