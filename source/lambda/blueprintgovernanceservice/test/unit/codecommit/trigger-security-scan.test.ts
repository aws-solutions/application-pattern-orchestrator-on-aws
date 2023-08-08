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

import { handler } from '../../../src/codecommit/trigger-security-scan';
import { mockClient } from 'aws-sdk-client-mock';
import { SNSEvent, Context } from 'aws-lambda';
import { StartBuildCommand, CodeBuildClient } from '@aws-sdk/client-codebuild';

const codeBuildClientMock = mockClient(CodeBuildClient);

beforeEach(() => {
    codeBuildClientMock.reset();
});

describe('Trigger Security check codebuild handler tests', () => {
    test('Trigger Security check codebuild handler', async () => {
        await handler(
            {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Records: [
                    {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        Sns: {
                            // eslint-disable-next-line @typescript-eslint/naming-convention
                            Message: JSON.stringify({
                                detail: {
                                    sourceCommit: '111',
                                    destinationCommit: '222',
                                    pullRequestId: '1',
                                    repositoryNames: ['testRepoName'],
                                },
                            }),
                        },
                    },
                ],
            } as unknown as SNSEvent,
            {} as unknown as Context,
        );
        expect(codeBuildClientMock.calls()).toHaveLength(1);
        expect(codeBuildClientMock.call(0).firstArg).toBeInstanceOf(StartBuildCommand);
    });
});
