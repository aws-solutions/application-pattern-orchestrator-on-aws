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
import '../../../src/common/BaseContainer';
import * as aws from 'aws-sdk';
import * as awsmock from 'aws-sdk-mock';
import { mock, reset } from 'ts-mockito';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { AttributeUpdateHandler } from '../../../src/handlers/AttributeUpdateHandler';
import { BlueprintDBService } from '../../../src/service/BlueprintDBService';
import { StaticLoggerFactory } from '../../../src/common/logging';
import { addSyncRequestToQueue } from '../../../src/common/AppRegistrySyncRequestQueue';

jest.mock('../../../src/common/AppRegistrySyncRequestQueue');
const mockAddSyncRequestToQueue = addSyncRequestToQueue as jest.Mock;

describe('attribute update handler tests', () => {
    awsmock.setSDKInstance(aws);
    const id = 'TESTKEY:TESTVALUE';
    const itemData = {
        id,
        name: 'TestKey:TestValue',
        key: 'TestKey',
        value: 'TestValue',
        description: 'Test description',
        metadata: {
            customField: 'customValue',
        },
        keyIndex: 'TESTKEY',
        createTime: new Date().toISOString(),
        lastUpdateTime: new Date().toISOString(),
    };
    beforeEach(() => {
        reset();
        jest.clearAllMocks();
    });

    test('test prepare data', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const updateAttributeHandle = jest.fn();
        blueprintDBService.updateAttribute = updateAttributeHandle;
        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockResolvedValue(itemData);

        const handler = new AttributeUpdateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const event = {
            key: 'tEsTkey',
            value: 'tEsTvAlUe',
            description: 'Test description updated',
            metadata: {
                customField: 'customValue updated',
                customField1: 'new customer value',
            },
        };

        const data = await handler.prepareData(
            (<unknown>{
                pathParameters: {
                    id,
                },
                body: JSON.stringify(event),
            }) as APIGatewayProxyEvent,
            id
        );

        expect(data).toEqual({
            id,
            name: 'tEsTkey:tEsTvAlUe',
            key: 'tEsTkey',
            value: 'tEsTvAlUe',
            description: 'Test description updated',
            metadata: {
                customField: 'customValue updated',
                customField1: 'new customer value',
            },
            keyIndex: 'TESTKEY',
            createTime: expect.any(String),
            lastUpdateTime: expect.any(String),
        });
    });

    test('test existing record not found', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const updateAttributeHandle = jest.fn();
        blueprintDBService.updateAttribute = updateAttributeHandle;
        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockResolvedValue(undefined);

        const handler = new AttributeUpdateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const event = {
            key: 'tEsTkey',
            value: 'tEsTvAlUe',
            description: 'Test description updated',
            metadata: {
                customField: 'customValue updated',
                customField1: 'new customer value',
            },
        };

        await expect(() =>
            handler.handle(
                (<unknown>{
                    httpMethod: 'PUT',
                    resource: '/attributes/{id}',
                    pathParameters: {
                        id,
                    },
                    body: JSON.stringify(event),
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message: 'Specified attribute is not found. id: TESTKEY:TESTVALUE',
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 404,
        });
    });

    test('test handler success', async () => {
        const timestamp = new Date().toISOString();
        const id = 'TESTKEY:TESTVALUE';
        const existingData = {
            id,
            name: 'TestKey:TestValue',
            key: 'TestKey',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
            keyIndex: 'TESTKEY',
            createTime: timestamp,
            lastUpdateTime: timestamp,
        };

        const blueprintDBService = mock(BlueprintDBService);
        const updateAttributeHandle = jest.fn();
        blueprintDBService.updateAttribute = updateAttributeHandle;
        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockResolvedValue(existingData);

        const handler = new AttributeUpdateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const event = {
            key: 'tEsTkey',
            value: 'tEsTvAlUe',
            description: 'Test description updated',
            metadata: {
                customField: 'customValue updated',
                customField1: 'new customer value',
            },
        };

        const data = await handler.handle(
            (<unknown>{
                httpMethod: 'PUT',
                resource: '/attributes/{id}',
                pathParameters: {
                    id,
                },
                body: JSON.stringify(event),
            }) as APIGatewayProxyEvent,
            {} as Context
        );

        expect(data).toEqual({
            body: expect.any(String),
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/json',
            },
            statusCode: 200,
        });

        expect(JSON.parse(data.body)).toEqual({
            name: 'tEsTkey:tEsTvAlUe',
            key: 'tEsTkey',
            value: 'tEsTvAlUe',
            description: 'Test description updated',
            metadata: {
                customField: 'customValue updated',
                customField1: 'new customer value',
            },
            createTime: expect.any(String),
            lastUpdateTime: expect.any(String),
        });

        expect(updateAttributeHandle).toBeCalledTimes(1);
        // eslint-disable-next-line @typescript-eslint/naming-convention
        expect(mockAddSyncRequestToQueue).toBeCalledWith('TESTKEY:TESTVALUE');
    });

    test('test handler failed when change key', async () => {
        const timestamp = new Date().toISOString();
        const id = 'TESTKEY:TESTVALUE';
        const existingData = {
            id,
            name: 'TestKey:TestValue',
            key: 'TestKey',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
            keyIndex: 'TESTKEY',
            createTime: timestamp,
            lastUpdateTime: timestamp,
        };

        const blueprintDBService = mock(BlueprintDBService);
        const updateAttributeHandle = jest.fn();
        blueprintDBService.updateAttribute = updateAttributeHandle;
        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockResolvedValue(existingData);

        const handler = new AttributeUpdateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const event = {
            key: 'TestKey1',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
        };

        await expect(() =>
            handler.handle(
                (<unknown>{
                    httpMethod: 'PUT',
                    resource: '/attributes/{id}',
                    pathParameters: {
                        id,
                    },
                    body: JSON.stringify(event),
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message:
                'The key and value are not allowed to be updated. Current Key: TestKey, Value: TestValue',
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 404,
        });
    });

    test('test handler failed when change value', async () => {
        const timestamp = new Date().toISOString();
        const id = 'TESTKEY:TESTVALUE';
        const existingData = {
            id,
            name: 'TestKey:TestValue',
            key: 'TestKey',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
            keyIndex: 'TESTKEY',
            createTime: timestamp,
            lastUpdateTime: timestamp,
        };
        const blueprintDBService = mock(BlueprintDBService);
        const updateAttributeHandle = jest.fn();
        blueprintDBService.updateAttribute = updateAttributeHandle;
        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockResolvedValue(existingData);

        const handler = new AttributeUpdateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const event = {
            key: 'TestKey',
            value: 'TestValue1',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
        };

        await expect(() =>
            handler.handle(
                (<unknown>{
                    httpMethod: 'PUT',
                    resource: '/attributes/{id}',
                    pathParameters: {
                        id,
                    },
                    body: JSON.stringify(event),
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message:
                'The key and value are not allowed to be updated. Current Key: TestKey, Value: TestValue',
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 404,
        });
    });

    test('test handler failed when change both key and value', async () => {
        const timestamp = new Date().toISOString();
        const id = 'TESTKEY:TESTVALUE';
        const existingData = {
            id,
            name: 'TestKey:TestValue',
            key: 'TestKey',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
            keyIndex: 'TESTKEY',
            createTime: timestamp,
            lastUpdateTime: timestamp,
        };
        const blueprintDBService = mock(BlueprintDBService);
        const updateAttributeHandle = jest.fn();
        blueprintDBService.updateAttribute = updateAttributeHandle;
        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockResolvedValue(existingData);

        const handler = new AttributeUpdateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        const event = {
            key: 'TestKey1',
            value: 'TestValue1',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
        };

        await expect(() =>
            handler.handle(
                (<unknown>{
                    httpMethod: 'PUT',
                    resource: '/attributes/{id}',
                    pathParameters: {
                        id,
                    },
                    body: JSON.stringify(event),
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message:
                'The key and value are not allowed to be updated. Current Key: TestKey, Value: TestValue',
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 404,
        });
    });
});
