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
import {
    CloudFormationClient,
    DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { getLogger } from '../common/BaseContainer';
import { SNSEvent, SNSEventRecord } from 'aws-lambda';
import { customUserAgentV3 } from '../common/customUserAgent';

const AWS_REGION = process.env.AWS_REGION;
const RAPM_METADATA_TABLE_NAME = process.env.RAPM_METADATA_TABLE_NAME;

const configuration = {
    region: AWS_REGION,
    customUserAgent: customUserAgentV3,
};

const cfnClient = new CloudFormationClient(configuration);

const ddbClient = new DynamoDBClient(configuration);
const ddbDocClient = DynamoDBDocument.from(ddbClient);

const logger = getLogger('UpdateBlueprintListStatusHandler');

/**
 * Update the infrastructure stack status for the given blueprint
 * @param blueprintId
 * @param status
 */
export async function updateBlueprintInfrastructureStackStatus(
    patternId: string,
    status: string
): Promise<void> {
    logger.info(
        `Updating pattern ${patternId} with infrastructure stack status ${status}`
    );
    await ddbDocClient.update({
        Key: {
            patternId,
        },
        TableName: RAPM_METADATA_TABLE_NAME,
        UpdateExpression: 'SET infrastructureStackStatus = :status',
        ExpressionAttributeValues: {
            ':status': status,
        },
    });
}

/**
 * Use infrastructure stack tags to find the corresponding blueprint ID
 * @param stackName
 * @returns
 */
const getBlueprintIdFromInfrastructureStackName = async (
    stackName: string
): Promise<string | undefined> => {
    const stack = await cfnClient.send(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        new DescribeStacksCommand({ StackName: stackName })
    );
    return stack.Stacks?.[0].Tags?.find((tag) => tag.Key == 'blueprintId')?.Value;
};

/**
 * Update the infrastructureStackStatus field of a blueprint when it's infrastructure stack gets updated
 * @param event
 * @param _context
 */
export async function handler(event: SNSEvent, _context: unknown): Promise<void> {
    logger.info(`Event: \n ${JSON.stringify(event, null, 2)}`);

    try {
        const cfStackMessagesLines: string[][] = event.Records.map(
            (record: SNSEventRecord) => {
                // Transform the sns message to an array of lines
                return record.Sns.Message.split('\n');
            }
        ).filter((messagesLines: string[]) => {
            // Apply filter to only keep cloudformation stack update messages
            return messagesLines.includes("ResourceType='AWS::CloudFormation::Stack'");
        });

        // Transform the array of "key='value'" lines to an object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cfStackNotifications: any[] = cfStackMessagesLines.map(
            (cfStackMessageLines) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return cfStackMessageLines.reduce((obj: any, messageLine: string) => {
                    const [key, value] = messageLine.split('=');
                    return {
                        ...obj,
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        [key]: value?.slice(1, -1), // Remove quotes around the value string
                    };
                }, {});
            }
        );

        // Update the infrastructure stack status of each blueprint
        for (const cfStackNotification of cfStackNotifications) {
            const blueprintId = await getBlueprintIdFromInfrastructureStackName(
                cfStackNotification.StackName
            );

            if (blueprintId) {
                await updateBlueprintInfrastructureStackStatus(
                    blueprintId,
                    cfStackNotification['ResourceStatus']
                );
            } else {
                logger.info(
                    `Could not find the blueprint ID for stack ${cfStackNotification.StackName}`
                );
            }
        }
    } catch (e) {
        logger.error(`Error in handler: ${JSON.stringify(e)}`);
    }
}
