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
import { Context, APIGatewayProxyEvent } from 'aws-lambda';
import { lambdaHandler } from '../../src/App';
import { CreateBlueprintRequestHandler } from '../../src/handlers/CreateBlueprintRequestHandler';
import { GetAllBlueprintsRequestHandler } from '../../src/handlers/GetAllBlueprintsRequestHandler';
import { GetBlueprintInfoHandler } from '../../src/handlers/GetBlueprintInfoHandler';
import { InitialiseBlueprintPipelineHandler } from '../../src/handlers/InitialiseBlueprintPipelineHandler';
import { AttributeCreateHandler } from '../../src/handlers/AttributeCreateHandler';
import { AttributeListHandler } from '../../src/handlers/AttributeListHandler';
import { AttributeGetDetailsHandler } from '../../src/handlers/AttributeGetDetailsHandler';
import { AttributeUpdateHandler } from '../../src/handlers/AttributeUpdateHandler';
import { AttributeDeleteHandler } from '../../src/handlers/AttributeDeleteHandler';

describe('Test compliance event', () => {
    test('should get OK response for /patterns POST request with CreateBlueprintRequestHandler', async () => {
        CreateBlueprintRequestHandler.prototype.handle = jest
            .fn()
            .mockResolvedValueOnce({});
        expect.assertions(1);

        // act
        await lambdaHandler(
            {
                httpMethod: 'POST',
                resource: '/patterns',
            } as APIGatewayProxyEvent,
            {} as Context,
            () => ({})
        );
        expect(CreateBlueprintRequestHandler.prototype.handle).toHaveBeenCalled();
    });
    test('should get OK response for /patterns GET request with GetAllBlueprintsRequestHandler', async () => {
        GetAllBlueprintsRequestHandler.prototype.handle = jest
            .fn()
            .mockResolvedValueOnce({});
        expect.assertions(1);

        // act
        await lambdaHandler(
            {
                httpMethod: 'GET',
                resource: '/patterns',
            } as APIGatewayProxyEvent,
            {} as Context,
            () => ({})
        );
        expect(GetAllBlueprintsRequestHandler.prototype.handle).toHaveBeenCalled();
    });

    test('should get OK response for /patterns/{id} GET request with GetAllBlueprintsRequestHandler', async () => {
        GetBlueprintInfoHandler.prototype.handle = jest.fn().mockResolvedValueOnce({});
        expect.assertions(1);

        // act
        await lambdaHandler(
            {
                httpMethod: 'GET',
                resource: '/patterns/{id}',
            } as APIGatewayProxyEvent,
            {} as Context,
            () => ({})
        );
        expect(GetBlueprintInfoHandler.prototype.handle).toHaveBeenCalled();
    });

    test('should get OK response for /patterns/pipeline/{id} PUT request with InitialiseBlueprintPipeline', async () => {
        InitialiseBlueprintPipelineHandler.prototype.handle = jest
            .fn()
            .mockResolvedValueOnce({});
        expect.assertions(1);

        // act
        await lambdaHandler(
            {
                httpMethod: 'PUT',
                resource: '/patterns/pipeline/{id}',
            } as APIGatewayProxyEvent,
            {} as Context,
            () => ({})
        );
        expect(InitialiseBlueprintPipelineHandler.prototype.handle).toHaveBeenCalled();
    });

    // attributes API tests
    test('should get OK response for /attributes POST request with AttributeCreateHandler', async () => {
        AttributeCreateHandler.prototype.handle = jest.fn().mockResolvedValueOnce({});
        expect.assertions(1);

        // act
        await lambdaHandler(
            {
                httpMethod: 'POST',
                resource: '/attributes',
            } as APIGatewayProxyEvent,
            {} as Context,
            () => ({})
        );
        expect(AttributeCreateHandler.prototype.handle).toHaveBeenCalled();
    });
    test('should get OK response for /attributes GET request with AttributeListHandler', async () => {
        AttributeListHandler.prototype.handle = jest.fn().mockResolvedValueOnce({});
        expect.assertions(1);

        // act
        await lambdaHandler(
            {
                httpMethod: 'GET',
                resource: '/attributes',
            } as APIGatewayProxyEvent,
            {} as Context,
            () => ({})
        );
        expect(AttributeListHandler.prototype.handle).toHaveBeenCalled();
    });

    test('should get OK response for /attributes/{id} GET request with AttributeGetDetailsHandler', async () => {
        AttributeGetDetailsHandler.prototype.handle = jest.fn().mockResolvedValueOnce({});
        expect.assertions(1);

        // act
        await lambdaHandler(
            {
                httpMethod: 'GET',
                resource: '/attributes/{id}',
            } as APIGatewayProxyEvent,
            {} as Context,
            () => ({})
        );
        expect(AttributeGetDetailsHandler.prototype.handle).toHaveBeenCalled();
    });

    test('should get OK response for /attributes/{id} PUT request with AttributeUpdateHandler', async () => {
        AttributeUpdateHandler.prototype.handle = jest.fn().mockResolvedValueOnce({});
        expect.assertions(1);

        // act
        await lambdaHandler(
            {
                httpMethod: 'PUT',
                resource: '/attributes/{id}',
            } as APIGatewayProxyEvent,
            {} as Context,
            () => ({})
        );
        expect(AttributeUpdateHandler.prototype.handle).toHaveBeenCalled();
    });

    test('should get OK response for /attributes/{id} DELETE request with AttributeDeleteHandler', async () => {
        AttributeDeleteHandler.prototype.handle = jest.fn().mockResolvedValueOnce({});
        expect.assertions(1);

        // act
        await lambdaHandler(
            {
                httpMethod: 'DELETE',
                resource: '/attributes/{id}',
            } as APIGatewayProxyEvent,
            {} as Context,
            () => ({})
        );
        expect(AttributeDeleteHandler.prototype.handle).toHaveBeenCalled();
    });
});
