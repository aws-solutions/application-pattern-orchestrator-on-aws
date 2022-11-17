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
import * as aws from 'aws-sdk';
import * as awsmock from 'aws-sdk-mock';
import { mock, reset } from 'ts-mockito';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { AttributeCreateHandler } from '../../../src/handlers/AttributeCreateHandler';
import { BlueprintDBService } from '../../../src/service/BlueprintDBService';
import { StaticLoggerFactory } from '../../../src/common/logging';
import { addSyncRequestToQueue } from '../../../src/common/AppRegistrySyncRequestQueue';

jest.mock('src/common/AppRegistrySyncRequestQueue');

const mockAddSyncRequestToQueue = addSyncRequestToQueue as jest.MockedFunction<
    typeof addSyncRequestToQueue
>;

describe('attribute create handler tests', () => {
    awsmock.setSDKInstance(aws);
    beforeEach(() => {
        reset();
        jest.clearAllMocks();
    });

    test('test prepare data', async () => {
        const blueprintDBService = mock(BlueprintDBService);

        const handler = new AttributeCreateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const event = {
            key: 'TestKey',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
        };

        const data = await handler.prepareData({
            body: JSON.stringify(event),
        } as APIGatewayProxyEvent);

        expect(data).toEqual({
            id: 'TESTKEY:TESTVALUE',
            name: 'TestKey:TestValue',
            key: 'TestKey',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
            keyIndex: 'TESTKEY',
            createTime: expect.any(String),
            lastUpdateTime: expect.any(String),
        });
    });

    test('test handler success', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const createAttributeHandle = jest.fn();
        blueprintDBService.createAttribute = createAttributeHandle;

        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockReturnValue({});

        const handler = new AttributeCreateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const event = {
            key: 'TestKey',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
        };

        const data = await handler.handle(
            (<unknown>{
                httpMethod: 'POST',
                resource: '/attributes',
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
            statusCode: 201,
        });

        expect(getAttributeByIdHandle).toBeCalledTimes(1);
        expect(createAttributeHandle).toBeCalledTimes(1);
        expect(mockAddSyncRequestToQueue).toBeCalledWith('TESTKEY:TESTVALUE');
    });

    test('test handler failed invalid key', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const createAttributeHandle = jest.fn();
        blueprintDBService.createAttribute = createAttributeHandle;

        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;

        const handler = new AttributeCreateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const event = {
            key: 'TestKey@#$',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
        };

        await expect(
            handler.handle(
                (<unknown>{
                    httpMethod: 'POST',
                    resource: '/attributes',
                    body: JSON.stringify(event),
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message: "The key must be specified and match '/^[-\\w]{1,120}$/'.",
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 400,
        });
    });

    test('test handler failed invalid value', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const createAttributeHandle = jest.fn();
        blueprintDBService.createAttribute = createAttributeHandle;

        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;

        const handler = new AttributeCreateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const event = {
            key: 'TestKey',
            value: 'TestValue,.#',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
        };

        await expect(
            handler.handle(
                (<unknown>{
                    httpMethod: 'POST',
                    resource: '/attributes',
                    body: JSON.stringify(event),
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message: "The value must be specified and match '/^[-\\w]{1,120}$/'.",
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 400,
        });
    });

    test('test handler failed missing key and value', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const createAttributeHandle = jest.fn();
        blueprintDBService.createAttribute = createAttributeHandle;

        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;

        const handler = new AttributeCreateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const event = {
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
        };

        await expect(
            handler.handle(
                (<unknown>{
                    httpMethod: 'POST',
                    resource: '/attributes',
                    body: JSON.stringify(event),
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message:
                "The key must be specified and match '/^[-\\w]{1,120}$/'.; The value must be specified and match '/^[-\\w]{1,120}$/'.",
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 400,
        });
    });

    test('test handler failed no body', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const createAttributeHandle = jest.fn();
        blueprintDBService.createAttribute = createAttributeHandle;

        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;

        const handler = new AttributeCreateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        await expect(
            handler.handle(
                (<unknown>{
                    httpMethod: 'POST',
                    resource: '/attributes',
                    body: '',
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message: 'Valid JSON payload is required in the body of the create request.',
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 400,
        });
    });

    test('test handler failed attribute exists', async () => {
        const itemData = {
            id: 'TESTKEY:TESTVALUE',
            name: 'TestKey:TestValue',
            key: 'TestKey',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
            keyIndex: 'TESTKEY',
        };

        const blueprintDBService = mock(BlueprintDBService);
        const createAttributeHandle = jest.fn();
        blueprintDBService.createAttribute = createAttributeHandle;

        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockResolvedValueOnce(itemData);

        const handler = new AttributeCreateHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const event = {
            key: 'TestKey',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
        };

        await expect(
            handler.handle(
                (<unknown>{
                    httpMethod: 'POST',
                    resource: '/attributes',
                    body: JSON.stringify(event),
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message: 'An attribute with the specific key and value already exists.',
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 400,
        });
        expect(getAttributeByIdHandle).toBeCalledTimes(1);
        expect(createAttributeHandle).toBeCalledTimes(0);
        expect(mockAddSyncRequestToQueue).toBeCalledTimes(0);
    });
});
