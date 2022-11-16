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
import '../../../src/common/BaseContainer';
import { container } from 'tsyringe';
import { EventBridgeEvent, Context } from 'aws-lambda';
import { SyncEventHandler } from '../../../src/timed-synchroniser/SyncEventHandler';
import { addSyncRequestToQueue } from '../../../src/common/AppRegistrySyncRequestQueue';
import { Attribute } from '../../../src/common/common-types';

jest.mock('src/common/AppRegistrySyncRequestQueue');

class BlueprintDbServiceMockWithAttributes {
    public async listAttributes(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        limit?: number,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        nextToken?: string
    ): Promise<[Attribute[], string]> {
        return [
            [
                {
                    id: 'TEST_ATTR_1_KEY:TEST_ATTR_1_VALUE',
                    name: 'test_attr_1_key:test_attr_1_value',
                    description: 'test description 1',
                    key: 'test_attr_1_key',
                    value: 'test_attr_1_value',
                    keyIndex: 'TEST_ATTR_1_KEY',
                    lastUpdateTime: '2022-05-11T23:33:09.277Z',
                    createTime: '2022-05-11T23:33:09.277Z',
                },
                {
                    id: 'TEST_ATTR_2_KEY:TEST_ATTR_2_VALUE',
                    name: 'test_attr_2_key:test_attr_2_value',
                    description: 'test description 2',
                    key: 'test_attr_2_key',
                    value: 'test_attr_2_value',
                    keyIndex: 'TEST_ATTR_2_KEY',
                    lastUpdateTime: '2022-05-11T23:33:09.277Z',
                    createTime: '2022-05-11T23:33:09.277Z',
                },
            ],
            '',
        ];
    }
}

class BlueprintDbServiceMockWithNoAttributes {
    public async listAttributes(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        limit?: number,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        nextToken?: string
    ): Promise<[Attribute[], string]> {
        return [[], ''];
    }
}

const mockAddSyncRequestToQueue = addSyncRequestToQueue as jest.MockedFunction<
    typeof addSyncRequestToQueue
>;

describe('SyncEventHandler test', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAddSyncRequestToQueue.mockReset();
    });

    test('test success event with multiple attributes', async () => {
        container.register<BlueprintDbServiceMockWithAttributes>('BlueprintDBService', {
            useClass: BlueprintDbServiceMockWithAttributes,
        });
        const handler = new SyncEventHandler();
        mockAddSyncRequestToQueue.mockResolvedValue({});
        const result = await handler.handle(
            {} as EventBridgeEvent<string, unknown>,
            {} as Context
        );
        expect(result).toEqual({
            body: 'SUCCEED',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'text/plain',
            },
            statusCode: 200,
        });
        expect(mockAddSyncRequestToQueue).toBeCalledTimes(2);
    });

    test('test event with no attributes', async () => {
        container.register<BlueprintDbServiceMockWithAttributes>('BlueprintDBService', {
            useClass: BlueprintDbServiceMockWithNoAttributes,
        });
        const handler = new SyncEventHandler();

        const result = await handler.handle(
            {} as EventBridgeEvent<string, unknown>,
            {} as Context
        );

        expect(result).toEqual({
            body: 'SUCCEED',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'text/plain',
            },
            statusCode: 200,
        });
        expect(mockAddSyncRequestToQueue).toBeCalledTimes(0);
    });
});
