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
import * as AWS from 'aws-sdk';
import { container } from 'tsyringe';
import { LoggerFactory } from '../common/logging';
import { AppConfiguration } from './configuration/AppConfiguration';
import { getUUID } from './Utils';
import { Logger } from './logging/logger-type';
/* eslint-disable @typescript-eslint/naming-convention */

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

// get logger
function getLogger(): Logger {
    return container
        .resolve<LoggerFactory>('LoggerFactory')
        .getLogger('AppRegistryUpdateHandler');
}

export async function addSyncRequestToQueue(
    id: string
): Promise<AWS.SQS.SendMessageResult | undefined> {
    const logger = getLogger();
    // use try catch to make sure this function will not throw errors
    // this is to make sure the update in main tables will not be disturbed
    try {
        const appConfig = container.resolve<AppConfiguration>('AppConfiguration');
        return await sqs
            .sendMessage({
                QueueUrl: appConfig.appRegistryUpdaterQueueUrl,
                MessageBody: JSON.stringify({ id, requestId: getUUID() }),
                MessageGroupId: 'appregistry-sync',
            })
            .promise();
        /* eslint-disable-next-line */
    } catch (e: any) {
        logger.error(
            `Failed to send update message to AppRegistry Update Queue. Error: ${JSON.stringify(
                e
            )}, ID: ${id} `
        );
        return undefined;
    }
}
