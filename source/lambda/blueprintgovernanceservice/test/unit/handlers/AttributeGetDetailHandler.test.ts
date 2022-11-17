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
import { AttributeGetDetailsHandler } from '../../../src/handlers/AttributeGetDetailsHandler';
import { StaticLoggerFactory } from '../../../src/common/logging';
import { BlueprintDBService } from '../../../src/service/BlueprintDBService';

describe('attribute get details handler tests', () => {
    awsmock.setSDKInstance(aws);
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('test handler success', async () => {
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

        const blueprintDBService = mock(BlueprintDBService);
        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockResolvedValue(itemData);

        const handler = new AttributeGetDetailsHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const data = await handler.handle(
            (<unknown>{
                httpMethod: 'GET',
                resource: '/attributes/{id}',
                pathParameters: {
                    id,
                },
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
            name: 'TestKey:TestValue',
            key: 'TestKey',
            value: 'TestValue',
            description: 'Test description',
            metadata: {
                customField: 'customValue',
            },
            createTime: expect.any(String),
            lastUpdateTime: expect.any(String),
        });

        expect(getAttributeByIdHandle).toBeCalledTimes(1);
    });

    test('test handler failed not found', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;

        const handler = new AttributeGetDetailsHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        const id = 'TESTKEY:TESTVALUE';

        await expect(
            handler.handle(
                (<unknown>{
                    httpMethod: 'GET',
                    resource: '/attributes/{id}',
                    pathParameters: {
                        id,
                    },
                    body: '',
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message: `Specified item is not found. id: ${id}`,
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 404,
        });

        expect(getAttributeByIdHandle).toBeCalledTimes(1);
    });
});
