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

import { StartBuildCommand, CodeBuildClient } from '@aws-sdk/client-codebuild';
import * as lambda from 'aws-lambda';
import { getLogger } from '../common/BaseContainer';
import { awsSdkV3Configuration } from '../common/customUserAgent';

const codeBuildClient = new CodeBuildClient(awsSdkV3Configuration);

export async function handler(
    event: lambda.SNSEvent,
    context: lambda.Context
): Promise<void> {
    const logger = getLogger('codecommit-trigger-security-scan');
    logger.debug(
        `Processing event ${JSON.stringify(event)} with context ${JSON.stringify(
            context
        )}`
    );
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const sourceCommitId = snsMessage.detail.sourceCommit;
    const destinationCommitId = snsMessage.detail.destinationCommit;
    const repositoryName = snsMessage.detail.repositoryNames[0];
    const prId = snsMessage.detail.pullRequestId;
    await codeBuildClient.send(
        new StartBuildCommand({
            projectName: `BlueprintChecks_${repositoryName}`,
            sourceVersion: sourceCommitId,
            environmentVariablesOverride: [
                {
                    name: 'BEFORE_COMMIT_ID',
                    value: destinationCommitId,
                },
                {
                    name: 'AFTER_COMMIT_ID',
                    value: sourceCommitId,
                },
                {
                    name: 'PR_NUMBER',
                    value: prId,
                },
            ],
        })
    );
}
