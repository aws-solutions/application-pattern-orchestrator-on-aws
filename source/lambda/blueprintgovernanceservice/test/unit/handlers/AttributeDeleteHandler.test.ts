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
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { addSyncRequestToQueue } from '../../../src/common/AppRegistrySyncRequestQueue';
import { AttributeDeleteHandler } from '../../../src/handlers/AttributeDeleteHandler';
import { StaticLoggerFactory } from '../../../src/common/logging';
import { mock } from 'ts-mockito';
import { BlueprintDBService } from '../../../src/service/BlueprintDBService';
import { BlueprintObject } from '../../../src/types/BlueprintType';

jest.mock('src/common/AppRegistrySyncRequestQueue');

const mockAddSyncRequestToQueue = addSyncRequestToQueue as jest.MockedFunction<
    typeof addSyncRequestToQueue
>;

describe('attribute delete handler tests', () => {
    const patternsList: BlueprintObject[] = [
        {
            patternId: 'TestId',
            name: 'mycdk',
            description: 'Test description',
            patternType: 'CDK',
            codeRepository: {
                type: 'type',
                repoOwner: 'repoOwner',
                branchName: 'branchName',
                repoName: 'repoName',
            },
            updatedTimestamp: 'time',
            createdTimestamp: 'time',
            attributes: {
                dataClassification: 'PII',
                hostingConstruct: 'EC2',
            },
        },
    ];

    const attributeData = {
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

    awsmock.setSDKInstance(aws);
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('test handler success', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const deleteAttributeHandle = jest.fn();
        blueprintDBService.deleteAttribute = deleteAttributeHandle;
        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockResolvedValue(attributeData);
        const listBlueprintsHandle = jest.fn();
        blueprintDBService.listBlueprints = listBlueprintsHandle;
        listBlueprintsHandle.mockResolvedValue({
            results: [],
            nextToken: '',
        });

        const handler = new AttributeDeleteHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        const id = 'TESTKEY:TESTVALUE';
        const data = await handler.handle(
            (<unknown>{
                httpMethod: 'DELETE',
                resource: '/attributes/{id}',
                pathParameters: {
                    id,
                },
                body: '',
            }) as APIGatewayProxyEvent,
            {} as Context
        );

        expect(data).toEqual({
            body: `{"id":"${id}"}`,
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/json',
            },
            statusCode: 200,
        });
        expect(deleteAttributeHandle).toBeCalledTimes(1);
        expect(deleteAttributeHandle).toBeCalledWith(id);
        expect(listBlueprintsHandle).toBeCalledTimes(1);
        expect(mockAddSyncRequestToQueue).toBeCalledTimes(1);
        expect(mockAddSyncRequestToQueue).toBeCalledWith(id);
    });

    test('test handler failed not found', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const deleteAttributeHandle = jest.fn();
        blueprintDBService.deleteAttribute = deleteAttributeHandle;
        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockResolvedValue(undefined);
        const listBlueprintsHandle = jest.fn();
        blueprintDBService.listBlueprints = listBlueprintsHandle;
        listBlueprintsHandle.mockResolvedValue({
            results: patternsList,
            nextToken: '',
        });

        const handler = new AttributeDeleteHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        const id = 'TESTKEY:TESTVALUE';

        await expect(
            handler.handle(
                (<unknown>{
                    httpMethod: 'DELETE',
                    resource: '/attributes/{id}',
                    pathParameters: {
                        id,
                    },
                    body: '',
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message: `Specified attribute is not found. id: ${id}`,
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 404,
        });

        expect(mockAddSyncRequestToQueue).toBeCalledTimes(0);
    });

    test('test handler failed attribute in use', async () => {
        const id = 'TESTKEY:TESTVALUE';
        const patternsListTestScope: BlueprintObject[] = [
            {
                ...patternsList[0],
                attributes: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    TestKey: 'TestValue',
                },
            },
        ];

        const blueprintDBService = mock(BlueprintDBService);

        const deleteAttributeHandle = jest.fn();
        blueprintDBService.deleteAttribute = deleteAttributeHandle;

        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockResolvedValue(attributeData);

        const listBlueprintsHandle = jest.fn();
        blueprintDBService.listBlueprints = listBlueprintsHandle;
        listBlueprintsHandle.mockResolvedValue({
            results: patternsListTestScope,
            nextToken: '',
        });

        const handler = new AttributeDeleteHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );

        await expect(
            handler.handle(
                (<unknown>{
                    httpMethod: 'DELETE',
                    resource: '/attributes/{id}',
                    pathParameters: {
                        id,
                    },
                    body: '',
                }) as APIGatewayProxyEvent,
                {} as Context
            )
        ).rejects.toEqual({
            message:
                'Specified attribute is in use and can not be deleted. id: TESTKEY:TESTVALUE',
            name: 'BasicHttpError',
            retryable: false,
            statusCode: 400,
        });

        expect(mockAddSyncRequestToQueue).toBeCalledTimes(0);
    });
});
