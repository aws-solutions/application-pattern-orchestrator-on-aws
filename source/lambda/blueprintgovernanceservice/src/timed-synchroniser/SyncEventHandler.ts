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
import { container } from 'tsyringe';
import { EventBridgeEvent, Context } from 'aws-lambda';
import { AsyncRequestHandler } from '../common/AsyncRequestHandler';
import { BasicHttpResponse, Attribute } from '../common/common-types';
import { addSyncRequestToQueue } from '../common/AppRegistrySyncRequestQueue';
import { BlueprintDBService } from '../service/BlueprintDBService';
import { QueryResult } from '../types/BlueprintType';
import { getLogger } from '../common/BaseContainer';

export type EventType = EventBridgeEvent<string, unknown>;

export class SyncEventHandler
    implements AsyncRequestHandler<EventType, BasicHttpResponse>
{
    private readonly logger = getLogger('SyncEventHandler');
    public async handle(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _event: EventType,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): Promise<BasicHttpResponse> {
        this.logger.info('Timed Synchroniser Started.');
        // sync attributes
        await this.syncToQueue();
        this.logger.info('Attribute sync requests added to queue');
        return BasicHttpResponse.ofString(200, 'SUCCEED');
    }

    private async syncToQueue(): Promise<void> {
        let nextToken: string | undefined = undefined;
        do {
            const getAttributesResponse: QueryResult = await getAttributes(nextToken);
            const items = getAttributesResponse[0];
            this.logger.info(`sync ${JSON.stringify(items)}`);
            for (const item of items) {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                const name = item.name ?? '';
                if (name) {
                    await addSyncRequestToQueue(name);
                    this.logger.info(`added to queue ${name}`);
                }
            }
            nextToken = getAttributesResponse[1];
        } while (nextToken);
    }
}

export async function getAttributes(
    nextToken: string | undefined
): Promise<[Attribute[], string]> {
    const blueprintDBService =
        container.resolve<BlueprintDBService>('BlueprintDBService');
    return blueprintDBService.listAttributes(100, nextToken);
}
