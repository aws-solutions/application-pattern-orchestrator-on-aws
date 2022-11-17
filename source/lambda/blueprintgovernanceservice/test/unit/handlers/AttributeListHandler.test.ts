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
import { mock } from 'ts-mockito';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { AttributeListHandler } from '../../../src/handlers/AttributeListHandler';
import { BlueprintDBService } from '../../../src/service/BlueprintDBService';
import { StaticLoggerFactory } from '../../../src/common/logging';

describe('attribute list handler tests', () => {
    awsmock.setSDKInstance(aws);
    const attributeList = [
        {
            id: 'HOSTINGCONSTRUCT:LAMBDA',
            name: 'Hostingconstruct:Lambda',
            key: 'Hostingconstruct',
            value: 'Lambda',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
            keyIndex: 'HOSTINGCONSTRUCT',
            createTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
        },
        {
            id: 'HOSTINGCONSTRUCT:LAMBDA1',
            name: 'Hostingconstruct:Lambda1',
            key: 'Hostingconstruct',
            value: 'Lambda1',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
            keyIndex: 'HOSTINGCONSTRUCT',
            createTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
        },
        {
            id: 'DATACLASSIFICATION:GROUP',
            name: 'Dataclassification:Group',
            key: 'Dataclassification',
            value: 'Group',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
            keyIndex: 'DATACLASSIFICATION',
            createTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
        },
        {
            id: 'TESTKEY2:TESTVALUE1',
            name: 'TestKey2:TestValue1',
            key: 'TestKey2',
            value: 'TestValue1',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
            keyIndex: 'TESTKEY2',
            createTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
        },
    ];
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('test handler success', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const listAttributesHandle = jest.fn();
        blueprintDBService.listAttributes = listAttributesHandle;
        listAttributesHandle.mockResolvedValue([attributeList, undefined]);

        const handler = new AttributeListHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const data = await handler.handle(
            (<unknown>{
                httpMethod: 'GET',
                resource: '/attributes',
                body: '',
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
            results: [
                {
                    name: 'Hostingconstruct:Lambda',
                    key: 'Hostingconstruct',
                    value: 'Lambda',
                    description: 'Test description',
                    metadata: {
                        customField: 'customValue',
                    },
                    createTime: expect.any(String),
                    lastUpdateTime: expect.any(String),
                },
                {
                    name: 'Hostingconstruct:Lambda1',
                    key: 'Hostingconstruct',
                    value: 'Lambda1',
                    description: 'Test description',
                    metadata: {
                        customField: 'customValue',
                    },
                    createTime: expect.any(String),
                    lastUpdateTime: expect.any(String),
                },
                {
                    name: 'Dataclassification:Group',
                    key: 'Dataclassification',
                    value: 'Group',
                    description: 'Test description',
                    metadata: {
                        customField: 'customValue',
                    },
                    createTime: expect.any(String),
                    lastUpdateTime: expect.any(String),
                },
                {
                    name: 'TestKey2:TestValue1',
                    key: 'TestKey2',
                    value: 'TestValue1',
                    description: 'Test description',
                    metadata: {
                        customField: 'customValue',
                    },
                    createTime: expect.any(String),
                    lastUpdateTime: expect.any(String),
                },
            ],
        });

        expect(listAttributesHandle).toBeCalledTimes(1);
    });

    test('test handler failed invalid maxRow', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const listAttributesHandle = jest.fn();
        blueprintDBService.listAttributes = listAttributesHandle;
        listAttributesHandle.mockResolvedValue([attributeList, undefined]);

        const handler = new AttributeListHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        await expect(
            handler.handle(
                (<unknown>{
                    httpMethod: 'GET',
                    resource: '/attributes',
                    queryStringParameters: {
                        maxRow: 'Invalid',
                    },
                    body: '',
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message:
                'The maxRow must be an integer between 1 and 1000. If not specified, the default value is 100.',
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 400,
        });
        expect(listAttributesHandle).toBeCalledTimes(0);
    });

    test('test handler failed invalid query parameters', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const listAttributesHandle = jest.fn();
        blueprintDBService.listAttributes = listAttributesHandle;
        listAttributesHandle.mockResolvedValue([attributeList, undefined]);

        const handler = new AttributeListHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        await expect(
            handler.handle(
                (<unknown>{
                    httpMethod: 'GET',
                    resource: '/attributes',
                    queryStringParameters: {
                        xyz: 'abc',
                    },
                    body: '',
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message: 'Unsupported query parameter. Query Parameters: xyz',
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 400,
        });

        expect(listAttributesHandle).toBeCalledTimes(0);
    });
});
