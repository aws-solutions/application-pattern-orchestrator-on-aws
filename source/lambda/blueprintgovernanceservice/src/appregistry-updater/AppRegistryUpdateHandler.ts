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
import { Context, SQSEvent, SQSRecord } from 'aws-lambda';
import 'reflect-metadata';
import { AsyncRequestHandler } from '../common/AsyncRequestHandler';
import { syncAttribute } from '../common/Attribute';
import { getLogger } from '../common/BaseContainer';
import { BasicHttpResponse } from '../common/common-types';

// get logger
const logger = getLogger('AppRegistryUpdateHandler');

export class AppRegistryUpdateHandler
    implements AsyncRequestHandler<SQSEvent, BasicHttpResponse>
{
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public async handle(event: SQSEvent, _context: Context): Promise<BasicHttpResponse> {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (event.Records) {
            for (const record of event.Records) {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (record) {
                    await this.processRecord(record);
                }
            }
        }
        return BasicHttpResponse.ofString(200, 'SUCCEED');
    }

    public async processRecord(record: SQSRecord): Promise<void> {
        let message: { id: string };
        try {
            message = JSON.parse(record.body);
            logger.info(`id: ${message.id}`);

            /* eslint-disable-next-line */
        } catch (e: any) {
            logger.error(
                `Invalid message received. Error: ${e.message}, Message:${record.body}`
            );
            throw new Error(`Invalid message received. Error: ${e.message}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (message) {
            await syncAttribute(message.id);
        }
    }
}
