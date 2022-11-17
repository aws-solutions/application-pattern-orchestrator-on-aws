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
import {
    CodeBuildClient,
    CreateWebhookCommand,
    DeleteWebhookCommand,
} from '@aws-sdk/client-codebuild';
import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { Octokit } from '@octokit/rest';
import { OctokitResponse } from '@octokit/types';
import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { awsSdkConfiguration } from '../common/common-types';
import { StaticLoggerFactory } from '../common/logger-factory';
import { LogLevelType } from '../common/logger-type';

const GITHUB_TOKEN_SECRET_ID = process.env.GITHUB_TOKEN_SECRET_ID;
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER;
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as LogLevelType;
const logger = new StaticLoggerFactory().getLogger('CreateWebhook', LOG_LEVEL);

const codebuildClient = new CodeBuildClient(awsSdkConfiguration);
const secretsManagerClient = new SecretsManagerClient(awsSdkConfiguration);

async function deleteCodebuildGithubWebhook(projectName: string): Promise<void> {
    await codebuildClient.send(
        new DeleteWebhookCommand({
            projectName,
        })
    );
}

async function createCodebuildGithubWebhook(
    projectName: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<OctokitResponse<any>> {
    const { webhook } = await codebuildClient.send(
        new CreateWebhookCommand({
            projectName,
        })
    );

    if (!webhook?.payloadUrl) {
        throw new Error('Undefined Codebuild webhook payloadUrl');
    }

    return createGithubWebhook(webhook.payloadUrl, webhook.secret);
}

async function getGithubToken(): Promise<string> {
    const { SecretString } = await secretsManagerClient.send(
        new GetSecretValueCommand({
            SecretId: GITHUB_TOKEN_SECRET_ID,
        })
    );

    if (!SecretString) {
        throw new Error('Could not find github token from secrets manager');
    }

    return SecretString;
}

async function createGithubWebhook(
    payloadUrl: string,
    secret: string | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<OctokitResponse<any>> {
    const githubToken = await getGithubToken();

    const apiBaseUrl = process.env.GITHUB_URL
        ? `${process.env.GITHUB_URL}/api/v3`
        : 'https://api.github.com';

    const octokit = new Octokit({
        auth: githubToken,
        baseUrl: apiBaseUrl,
    });

    return octokit.request(`POST /repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/hooks`, {
        accept: 'application/vnd.github.v3+json',
        name: 'web',
        config: {
            url: payloadUrl,
            ...(secret && { secret }),
            content_type: 'json',
        },
        events: ['push', 'pull_request'],
    });
}

export async function handler(event: CloudFormationCustomResourceEvent): Promise<void> {
    logger.defaultMeta = { requestId: event.RequestId };
    logger.info(`New event ${JSON.stringify(event, null, 2)}`);

    const requestType = event.RequestType;

    const { PROJECT_NAME } = event.ResourceProperties;

    if (requestType === 'Create') {
        try {
            const response = await createCodebuildGithubWebhook(PROJECT_NAME);
            logger.info(
                `Successfully created Codebuild Github webhook: ${JSON.stringify(
                    response
                )}`
            );
        } catch (err) {
            logger.error(`Could not create webhook: ${JSON.stringify(err)}`);
            try {
                // Try cleaning up codebuild webhook
                await deleteCodebuildGithubWebhook(PROJECT_NAME);
            } catch (err2) {
                logger.error(
                    `Could not delete Codebuild Github webhook: ${JSON.stringify(err2)}`
                );
            }
            throw new Error(`Could not create Codebuild Github webhook: ${err}`);
        }
    } else if (requestType === 'Delete') {
        try {
            await deleteCodebuildGithubWebhook(PROJECT_NAME);
            logger.info('Successfully deleted Codebuild Github webhook');
        } catch (err) {
            // Ignore webhook clean up failures
            logger.error(
                `Could not delete Codebuild Github webhook: ${JSON.stringify(err)}`
            );
        }
    }
}
