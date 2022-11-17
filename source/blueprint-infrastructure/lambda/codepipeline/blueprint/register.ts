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
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand, PublishCommandInput } from '@aws-sdk/client-sns';

import {
    CodePipelineClient,
    PutJobSuccessResultCommand,
    PutJobFailureResultCommand,
} from '@aws-sdk/client-codepipeline';
import {
    BlueprintVersionObject,
    BlueprintArtifact,
    NpmPackageDetails,
} from '../types/BlueprintTypes';
import { CodePipelineEvent, Context } from 'aws-lambda';
import { StaticLoggerFactory } from '../../common/logger-factory';
import { awsSdkConfiguration } from '../../common/common-types';
import { getPatternById } from './common';
import { LogLevelType } from '../../common/logger-type';

const AWS_ACCOUNT = process.env.AWS_ACCOUNT;
const AWS_REGION = process.env.AWS_REGION;
const RAPM_METADATA_TABLE_NAME = process.env.RAPM_METADATA_TABLE_NAME;
const RAPM_PUBLISH_DATA_TABLE_NAME = process.env.RAPM_PUBLISH_DATA_TABLE_NAME;
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as LogLevelType;
const logger = new StaticLoggerFactory().getLogger('PatternRegister', LOG_LEVEL);

const ddbClient = new DynamoDBClient(awsSdkConfiguration);

const ddbDocClient = DynamoDBDocument.from(ddbClient, {
    marshallOptions: {
        // Remove undefined values while marshalling because some fields won't be set depending on blueprint type
        removeUndefinedValues: true,
    },
});

const snsClient = new SNSClient(awsSdkConfiguration);

const codepipelineClient = new CodePipelineClient(awsSdkConfiguration);

async function registerBlueprintVersion(
    item: Partial<BlueprintVersionObject>
): Promise<void> {
    // Inserting publish data and updating lastCommitId in metadata table in a transaction
    await ddbDocClient.transactWrite({
        TransactItems: [
            {
                Put: {
                    TableName: RAPM_PUBLISH_DATA_TABLE_NAME,
                    Item: item,
                },
            },
            {
                Update: {
                    TableName: RAPM_METADATA_TABLE_NAME,
                    Key: {
                        patternId: item.patternId,
                    },
                    UpdateExpression:
                        'SET lastCommitId = :lastCommitId, updatedTimestamp = :updatedTimestamp',
                    ExpressionAttributeValues: {
                        ':lastCommitId': item.commitId,
                        ':updatedTimestamp': new Date().toISOString(),
                    },
                },
            },
        ],
    });
}

export async function notifySubscribers(
    item: Partial<BlueprintVersionObject>
): Promise<void> {
    const patternDetails = await getPatternById(ddbDocClient, item.patternId as string);

    // Do nothing when pattern is not found in dynamodb
    if (!patternDetails) {
        return;
    }

    const message = {
        patternId: item.patternId,
        patternName: item.patternId,
        patternDescription: patternDetails.description ?? '',
        patternAttributes: patternDetails.attributes ?? {},
        patternUri: `https://${process.env.RAPM_PORTAL_URL}/patterns/${item.patternId}`,
        commitMessage: item.commitMessage,
        commitId: item.commitId,
        sourceRepo: patternDetails.patternRepoURL.replace('git://', 'https://'),
        modifiedPackages: item.changedPackages?.map((p) => ({
            name: p.name,
            version: p.version,
        })),
        ...(item.codeArtifactDetails
            ? {
                  codeArtifact: {
                      account: item.codeArtifactDetails.account,
                      region: item.codeArtifactDetails.region,
                      domain: item.codeArtifactDetails.codeArtifactDomainName,
                      repository: item.codeArtifactDetails.codeArtifactRepositoryName,
                  },
              }
            : {}),
        ...(item.changedServiceCatalogProducts
            ? {
                  serviceCatalog: {
                      account: item.changedServiceCatalogProducts[0].account,
                      region: item.changedServiceCatalogProducts[0].region,
                      products: item.changedServiceCatalogProducts.map((p) => p.name),
                  },
              }
            : {}),
    };

    logger.debug(`Notification message: ${JSON.stringify(message)}`);

    const params: PublishCommandInput = {
        Subject: `AWS application pattern ${item.patternId} is available to use`,
        Message: JSON.stringify(message),
        TopicArn: process.env.RAPM_NOTIFICATION_TOPIC_ARN,
    };

    await snsClient.send(new PublishCommand(params));
}

export async function handler(event: CodePipelineEvent, context: Context): Promise<void> {
    logger.defaultMeta = { requestId: context.awsRequestId };

    const BLUEPRINT_ID = process.env.BLUEPRINT_ID;
    const CODE_ARTIFACT_DOMAIN_NAME = process.env.CODE_ARTIFACT_DOMAIN_NAME;
    const CODE_ARTIFACT_REPOSITORY_NAME = process.env.CODE_ARTIFACT_REPOSITORY_NAME;

    const jobId = event['CodePipeline.job'].id;

    try {
        const userParameters = event[
            'CodePipeline.job'
        ].data.actionConfiguration.configuration.UserParameters.replace(/\n/g, ' ');
        logger.debug(`UserParameters: ${userParameters}`);

        const {
            VERSION_COMMIT_ID,
            VERSION_COMMIT_MESSAGE,
            BLUEPRINT_TYPE,
            CONTROL_ARTIFACTS_LOCATION,
            CONTROL_ARTIFACTS_NAMES,
            IMAGE_ARTIFACTS_LOCATION,
            IMAGE_ARTIFACTS_NAMES,
            MARKDOWN_ARTIFACTS_LOCATION,
            MARKDOWN_ARTIFACTS_NAMES,
            CHANGED_SERVICE_CATALOG_PRODUCTS,
            ALL_SERVICE_CATALOG_PRODUCTS,
            CHANGED_PACKAGES,
            ALL_PACKAGES,
        } = JSON.parse(userParameters);

        const changedPackagesParsed = CHANGED_PACKAGES
            ? JSON.parse(
                  // The products JSON is base 64 encoded by the publish handler
                  Buffer.from(CHANGED_PACKAGES, 'base64').toString()
              )
            : undefined;

        const allPackagesParsed = ALL_PACKAGES
            ? JSON.parse(
                  // The products JSON is base 64 encoded by the publish handler
                  Buffer.from(ALL_PACKAGES, 'base64').toString()
              )
            : undefined;

        const changedPackagesForRegistration = changedPackagesParsed?.map(
            (changedPackagesItem: NpmPackageDetails) => ({
                name: changedPackagesItem.name,
                version: allPackagesParsed.find(
                    (allPackagesItem: NpmPackageDetails) =>
                        allPackagesItem.name === changedPackagesItem.name
                ).version,
            })
        );

        if (
            !changedPackagesForRegistration ||
            changedPackagesForRegistration.length === 0
        ) {
            logger.info('Not a new version: skipping registration');
            await codepipelineClient.send(new PutJobSuccessResultCommand({ jobId }));
            return;
        }

        const allPackagesForRegistration = allPackagesParsed.map(
            (allPackagesItem: NpmPackageDetails) => ({
                name: allPackagesItem.name,
                version: allPackagesItem.version,
            })
        );

        const artifacts: BlueprintArtifact[] = [];

        const controlArtifactsNames = CONTROL_ARTIFACTS_NAMES
            ? CONTROL_ARTIFACTS_NAMES.split(',')
            : [];
        for (const controlArtifactName of controlArtifactsNames) {
            artifacts.push({
                location: `${CONTROL_ARTIFACTS_LOCATION}/${controlArtifactName}`,
                type: 'CONTROL',
                name: controlArtifactName,
            });
        }

        const imageArtifactsNames = IMAGE_ARTIFACTS_NAMES
            ? IMAGE_ARTIFACTS_NAMES.split(',')
            : [];
        for (const imageArtifactName of imageArtifactsNames) {
            artifacts.push({
                location: `${IMAGE_ARTIFACTS_LOCATION}/${imageArtifactName}`,
                type: 'IMAGE',
                name: imageArtifactName,
            });
        }

        const markdownArtifactsNames = MARKDOWN_ARTIFACTS_NAMES
            ? MARKDOWN_ARTIFACTS_NAMES.split(',')
            : [];
        for (const markdownArtifactName of markdownArtifactsNames) {
            artifacts.push({
                location: `${MARKDOWN_ARTIFACTS_LOCATION}/${markdownArtifactName}`,
                type: 'MARKDOWN',
                name: markdownArtifactName,
            });
        }

        // Service catalog products are only for CFN blueprints
        const changedServiceCatalogProducts = CHANGED_SERVICE_CATALOG_PRODUCTS
            ? JSON.parse(
                  // The products JSON is base 64 encoded by the publish handler
                  Buffer.from(CHANGED_SERVICE_CATALOG_PRODUCTS, 'base64').toString()
              )
            : undefined;
        const allServiceCatalogProducts = ALL_SERVICE_CATALOG_PRODUCTS
            ? JSON.parse(
                  // The products JSON is base 64 encoded by the publish handler
                  Buffer.from(ALL_SERVICE_CATALOG_PRODUCTS, 'base64').toString()
              )
            : undefined;

        const registerPatternVersionObject: Partial<BlueprintVersionObject> = {
            patternId: BLUEPRINT_ID,
            commitId: VERSION_COMMIT_ID,
            commitMessage: VERSION_COMMIT_MESSAGE,
            createdTimestamp: new Date().toISOString(),
            updatedTimestamp: new Date().toISOString(),
            artifacts: artifacts,
            changedPackages: changedPackagesForRegistration,
            allPackages: allPackagesForRegistration,
            changedServiceCatalogProducts,
            allServiceCatalogProducts,
        };
        if (BLUEPRINT_TYPE === 'CDK') {
            registerPatternVersionObject['codeArtifactDetails'] = {
                account: AWS_ACCOUNT as string,
                region: AWS_REGION as string,
                codeArtifactDomainName: CODE_ARTIFACT_DOMAIN_NAME as string,
                codeArtifactRepositoryName: CODE_ARTIFACT_REPOSITORY_NAME as string,
            };
        }
        await registerBlueprintVersion(registerPatternVersionObject);
        await notifySubscribers(registerPatternVersionObject);

        await codepipelineClient.send(
            new PutJobSuccessResultCommand({
                jobId,
            })
        );
    } catch (e) {
        logger.error(`Error: ${JSON.stringify(e)}`);
        await codepipelineClient.send(
            new PutJobFailureResultCommand({
                jobId,
                failureDetails: {
                    message: 'JobFailed',
                    type: 'JobFailed',
                    externalExecutionId: context.awsRequestId,
                },
            })
        );
        throw e;
    }
}
