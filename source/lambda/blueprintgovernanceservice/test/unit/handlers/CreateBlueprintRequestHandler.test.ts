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
import { BlueprintPipelineBuilderService } from '../../../src/service/BlueprintPipelineBuilderService';
import { githubCreateAndInitialiseRepoResponse } from '../stubs/githubResponseStub';
import {
    CreateBlueprintRequest,
    CreateBlueprintRequestHandler,
} from '../../../src/handlers/CreateBlueprintRequestHandler';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { Attribute } from '../../../src/common/common-types';
import * as OperationalMetric from '../../../src/common/metrics/operational-metric';
import { BlueprintGitHubRepoBuilderService } from '../../../src/service/blueprint-repo-builder/BlueprintGitHubRepoBuilderService';

const inputRequest: CreateBlueprintRequest = {
    name: 'serverlessapp',
    description: 'serverlessapp',
    patternType: 'CDK',
    email: 'AWS@', //Email address of the Blueprint owner
    owner: 'awsapjsb', //Owner of the Blueprint
};
const attribute: Attribute = {
    id: 'DATACLASSIFICATION:GROUP',
    name: 'dataClassification:group',
    description: 'test description 1',
    key: 'dataClassification',
    value: 'group',
    keyIndex: 'DATACLASSIFICATION',
    lastUpdateTime: '2022-05-11T23:33:09.277Z',
    createTime: '2022-05-11T23:33:09.277Z',
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

    test('should return 201 on successful creation of blueprint', async () => {
        const testInputRequest: CreateBlueprintRequest = {
            name: 'serverlessapp',
            description: 'serverlessapp',
            patternType: 'CDK',
            email: 'AWS@', //Email address of the Blueprint owner
            owner: 'awsapjsb', //Owner of the Blueprint
            attributes: {
                dataClassification: 'Group',
            },
        };

        process.env.CODEOWNERS = '@owner1,@owner2';
        process.env.SOLUTION_ID = 'SOTEST';
        process.env.SOLUTION_VERSION = 'v1.x.x';
        process.env.ANONYMOUS_DATA_UUID = 'c0cc07de-d239-4ed9-92b6-cf7c82027aeb';

        const blueprintDBService = mock(BlueprintDBService);
        const getBlueprintByIdHandle = jest.fn();
        blueprintDBService.getBlueprintById = getBlueprintByIdHandle;
        getBlueprintByIdHandle.mockReturnValue(false);

        const createBlueprintHandle = jest.fn();
        blueprintDBService.createBlueprint = createBlueprintHandle;
        createBlueprintHandle.mockReturnValue({});

        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockReturnValue(attribute);

        const blueprintRepoBuilderService = mock(BlueprintGitHubRepoBuilderService);
        const blueprintRepoBuilderServiceHandle = jest.fn();
        blueprintRepoBuilderService.createAndInitializeRepo =
            blueprintRepoBuilderServiceHandle;
        blueprintRepoBuilderServiceHandle.mockReturnValue(
            githubCreateAndInitialiseRepoResponse
        );

        const blueprintPipelineBuilderService = mock(BlueprintPipelineBuilderService);
        const blueprintPipelineBuilderServiceHandle = jest.fn();

        blueprintPipelineBuilderService.invokeCodeBuildProject =
            blueprintPipelineBuilderServiceHandle;
        blueprintPipelineBuilderServiceHandle.mockReturnValue({});

        const sendAnonymousMetricSpy = jest
            .spyOn(OperationalMetric, 'sendAnonymousMetric')
            .mockReturnValue(Promise.resolve('Succeeded'));

        const objectUnderTest = new CreateBlueprintRequestHandler(
            new StaticLoggerFactory(),
            blueprintDBService,
            blueprintRepoBuilderService,
            blueprintPipelineBuilderService
        );
        // act
        const output = await objectUnderTest.handle(
            {
                body: JSON.stringify(testInputRequest),
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );
        expect(sendAnonymousMetricSpy).toBeCalledWith({
            anonymousDataUUID: 'c0cc07de-d239-4ed9-92b6-cf7c82027aeb',
            awsSolutionId: 'SOTEST',
            awsSolutionVersion: 'v1.x.x',
            data: { patternCreated: 1 },
        });
        expect(output).toBeDefined();
        expect(output.statusCode).toBe(201);
        expect(blueprintRepoBuilderService.createAndInitializeRepo).toBeCalled();
    });

    test('should return 4XX error if blueprint exists', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const getBlueprintByIdHandle = jest.fn();
        blueprintDBService.getBlueprintById = getBlueprintByIdHandle;
        getBlueprintByIdHandle.mockReturnValue(true);
        const blueprintRepoBuilderService = mock(BlueprintGitHubRepoBuilderService);
        const blueprintPipelineBuilderService = mock(BlueprintPipelineBuilderService);

        const objectUnderTest = new CreateBlueprintRequestHandler(
            new StaticLoggerFactory(),
            blueprintDBService,
            blueprintRepoBuilderService,
            blueprintPipelineBuilderService
        );
        // act
        const output = await objectUnderTest.handle(
            {
                body: JSON.stringify(inputRequest),
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );
        expect(output).toBeDefined();
        // assert
        expect(output).not.toBeUndefined();
        expect(output.statusCode).toBe(409);
    });

    test('should return 500 error if create repo fails exists', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const getBlueprintByIdHandle = jest.fn();
        blueprintDBService.getBlueprintById = getBlueprintByIdHandle;
        getBlueprintByIdHandle.mockReturnValue(false);
        const blueprintRepoBuilderService = mock(BlueprintGitHubRepoBuilderService);
        const blueprintRepoBuilderServiceCreateRepoAndInit = jest.fn();
        blueprintRepoBuilderService.createAndInitializeRepo =
            blueprintRepoBuilderServiceCreateRepoAndInit;
        blueprintRepoBuilderServiceCreateRepoAndInit.mockRejectedValueOnce(
            new Error('Unable to create repo')
        );
        const blueprintPipelineBuilderService = mock(BlueprintPipelineBuilderService);

        const objectUnderTest = new CreateBlueprintRequestHandler(
            new StaticLoggerFactory(),
            blueprintDBService,
            blueprintRepoBuilderService,
            blueprintPipelineBuilderService
        );
        // act
        const output = await objectUnderTest.handle(
            {
                body: JSON.stringify(inputRequest),
                pathParameters: { id: '123' },
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );
        expect(output).toBeDefined();
        // assert
        expect(output).not.toBeUndefined();
        expect(output.statusCode).toBe(500);
    });
});

describe('test CreateBlueprintRequestHandler error flow', () => {
    awsmock.setSDKInstance(aws);

    beforeEach(() => {
        reset();
        jest.clearAllMocks();
    });
    test('should return 400 if attribute does not exist', async () => {
        const testInputRequest: CreateBlueprintRequest = {
            name: 'serverlessapp',
            description: 'serverlessapp',
            patternType: 'CDK',
            email: 'AWS@', //Email address of the Blueprint owner
            owner: 'awsapjsb', //Owner of the Blueprint
            attributes: {
                dataClassification2: 'Group',
            },
        };

        process.env.CODEOWNERS = '@owner1,@owner2';
        const blueprintDBService = mock(BlueprintDBService);
        const getBlueprintByIdHandle = jest.fn();
        blueprintDBService.getBlueprintById = getBlueprintByIdHandle;
        getBlueprintByIdHandle.mockReturnValue(false);

        const createBlueprintHandle = jest.fn();
        blueprintDBService.createBlueprint = createBlueprintHandle;
        createBlueprintHandle.mockReturnValue({});

        const getAttributeByIdHandle = jest.fn();
        blueprintDBService.getAttributeById = getAttributeByIdHandle;
        getAttributeByIdHandle.mockReturnValue({});

        const blueprintRepoBuilderService = mock(BlueprintGitHubRepoBuilderService);
        const blueprintRepoBuilderServiceHandle = jest.fn();
        blueprintRepoBuilderService.createAndInitializeRepo =
            blueprintRepoBuilderServiceHandle;
        blueprintRepoBuilderServiceHandle.mockReturnValue(
            githubCreateAndInitialiseRepoResponse
        );

        const blueprintPipelineBuilderService = mock(BlueprintPipelineBuilderService);
        const blueprintPipelineBuilderServiceHandle = jest.fn();

        blueprintPipelineBuilderService.invokeCodeBuildProject =
            blueprintPipelineBuilderServiceHandle;
        blueprintPipelineBuilderServiceHandle.mockReturnValue({});

        const objectUnderTest = new CreateBlueprintRequestHandler(
            new StaticLoggerFactory(),
            blueprintDBService,
            blueprintRepoBuilderService,
            blueprintPipelineBuilderService
        );
        // act
        const output = await objectUnderTest.handle(
            {
                body: JSON.stringify(testInputRequest),
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );
        expect(output).toBeDefined();
        expect(output.statusCode).toBe(400);
    });
    test('should return 409 error if empty body', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const getBlueprintByIdHandle = jest.fn();
        blueprintDBService.getBlueprintById = getBlueprintByIdHandle;
        getBlueprintByIdHandle.mockReturnValue(false);
        const blueprintRepoBuilderService = mock(BlueprintGitHubRepoBuilderService);
        const blueprintRepoBuilderServiceHandle = jest.fn();
        blueprintRepoBuilderService.createAndInitializeRepo =
            blueprintRepoBuilderServiceHandle;
        blueprintRepoBuilderServiceHandle.mockReturnValue(
            githubCreateAndInitialiseRepoResponse
        );
        const createBlueprintHandle = jest.fn();
        blueprintDBService.createBlueprint = createBlueprintHandle;
        createBlueprintHandle.mockReturnValue({});

        const blueprintPipelineBuilderService = mock(BlueprintPipelineBuilderService);

        const objectUnderTest = new CreateBlueprintRequestHandler(
            new StaticLoggerFactory(),
            blueprintDBService,
            blueprintRepoBuilderService,
            blueprintPipelineBuilderService
        );
        // act
        const output = await objectUnderTest.handle(
            {
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );
        expect(output).toBeDefined();
        // assert
        expect(output).not.toBeUndefined();
        expect(output.statusCode).toBe(409);
    });
    test('should return 500 error if problem in invoking invoke pipeline service', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const getBlueprintByIdHandle = jest.fn();
        blueprintDBService.getBlueprintById = getBlueprintByIdHandle;
        getBlueprintByIdHandle.mockReturnValue(false);
        const blueprintRepoBuilderService = mock(BlueprintGitHubRepoBuilderService);
        const blueprintRepoBuilderServiceHandle = jest.fn();
        blueprintRepoBuilderService.createAndInitializeRepo =
            blueprintRepoBuilderServiceHandle;
        blueprintRepoBuilderServiceHandle.mockReturnValue(
            githubCreateAndInitialiseRepoResponse
        );
        const createBlueprintHandle = jest.fn();
        blueprintDBService.createBlueprint = createBlueprintHandle;
        createBlueprintHandle.mockReturnValue({});

        const blueprintPipelineBuilderService = mock(BlueprintPipelineBuilderService);
        const blueprintPipelineBuilderServiceHandle = jest.fn();
        blueprintPipelineBuilderService.invokeCodeBuildProject =
            blueprintPipelineBuilderServiceHandle;
        blueprintPipelineBuilderServiceHandle.mockRejectedValueOnce(
            new Error('Error invoking codebuild')
        );

        const objectUnderTest = new CreateBlueprintRequestHandler(
            new StaticLoggerFactory(),
            blueprintDBService,
            blueprintRepoBuilderService,
            blueprintPipelineBuilderService
        );
        // act
        const output = await objectUnderTest.handle(
            {
                body: JSON.stringify(inputRequest),
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );
        expect(output).toBeDefined();
        expect(blueprintPipelineBuilderService.invokeCodeBuildProject).toHaveBeenCalled();
        expect(output.statusCode).toBe(500);
    });

    test('should return 400 error if blueprint name is invalid', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const blueprintRepoBuilderService = mock(BlueprintGitHubRepoBuilderService);
        const blueprintPipelineBuilderService = mock(BlueprintPipelineBuilderService);

        const blueprintRequest: CreateBlueprintRequest = {
            name: '$$00000abc',
            description: 'serverlessapp',
            patternType: 'CDK',
            email: 'AWS@', //Email address of the Blueprint owner
            owner: 'awsapjsb', //Owner of the Blueprint
        };

        const objectUnderTest = new CreateBlueprintRequestHandler(
            new StaticLoggerFactory(),

            blueprintDBService,
            blueprintRepoBuilderService,
            blueprintPipelineBuilderService
        );
        // act
        const output = await objectUnderTest.handle(
            {
                body: JSON.stringify(blueprintRequest),
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(output.statusCode).toBe(400);
    });
});
