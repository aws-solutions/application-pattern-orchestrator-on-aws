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
import { mock, reset } from 'ts-mockito';
import * as aws from 'aws-sdk';
import * as awsmock from 'aws-sdk-mock';
import { BlueprintDBService } from '../../../src/service/BlueprintDBService';
import { StaticLoggerFactory } from '../../../src/common/logging';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import {
    UpdateBlueprintMetaInfoHandler,
    UpdateBlueprintRequest,
} from '../../../src/handlers/UpdateBlueprintMetaInfoHandler';

const fixtureGetBlueprintById = {
    patternId: 'test-pattern',
    attributes: {
        attr1: 'value1',
        attr2: 'value2',
    },
    codeRepository: {
        branchName: 'master',
        repoName: 'test-pattern',
        repoOwner: 'enterprise',
        type: 'github',
    },
    createdTimestamp: '2022-10-11T05:29:29.739Z',
    description: 'test description',
    infrastructureStackStatus: 'CREATE_COMPLETE',
    name: 'ver-test-17-cdk',
    patternRepoURL: 'git://dev.github/enterprise/test-pattern.git',
    patternType: 'CDK',
    updatedTimestamp: '2022-10-11T05:49:01.275Z',
};

const inputRequestPayload: UpdateBlueprintRequest = {
    description: 'test description',
    attributes: {
        attr1: 'value1',
        attr2: 'value2',
    },
};

describe('test CreateBlueprintRequestHandler', () => {
    awsmock.setSDKInstance(aws);
    const processEnvironment = process.env;

    beforeEach(() => {
        reset();
        jest.clearAllMocks();
        process.env = { ...processEnvironment };
    });

    afterAll(() => {
        process.env = processEnvironment;
    });

    test('should return 200 on successful update of blueprint metadata', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const getBlueprintByIdHandle = jest.fn();
        blueprintDBService.getBlueprintById = getBlueprintByIdHandle;
        getBlueprintByIdHandle.mockReturnValue(fixtureGetBlueprintById);

        const updateBlueprintMetaDataHandle = jest.fn();
        blueprintDBService.updateBlueprintMetaData = updateBlueprintMetaDataHandle;
        updateBlueprintMetaDataHandle.mockReturnValue({});

        const objectUnderTest = new UpdateBlueprintMetaInfoHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        // act
        const output = await objectUnderTest.handle(
            {
                pathParameters: {
                    id: 'test-pattern',
                },
                body: JSON.stringify(inputRequestPayload),
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(output).toBeDefined();
        expect(output).not.toBeUndefined();
        expect(output.statusCode).toBe(200);
        expect(getBlueprintByIdHandle).toHaveBeenCalledWith('test-pattern');
        expect(updateBlueprintMetaDataHandle).toHaveBeenCalledWith(
            'test-pattern',
            inputRequestPayload.description,
            inputRequestPayload.attributes
        );
    });

    test('should return 400 when there is no body passed to the handler', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const objectUnderTest = new UpdateBlueprintMetaInfoHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        // act
        const output = await objectUnderTest.handle(
            {
                pathParameters: {
                    id: 'test-pattern',
                },
                body: undefined,
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(output.statusCode).toBe(400);
    });

    test('should return 400 when there is no pattern id is passed as path parameter', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const objectUnderTest = new UpdateBlueprintMetaInfoHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        // act
        const output = await objectUnderTest.handle(
            {
                body: JSON.stringify(inputRequestPayload),
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(output.statusCode).toBe(400);
    });
});
