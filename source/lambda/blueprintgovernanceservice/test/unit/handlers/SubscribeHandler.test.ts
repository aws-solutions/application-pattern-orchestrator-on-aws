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
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { instance, mock, when } from 'ts-mockito';
import { SubscribeHandler } from '../../../src/handlers/SubscribeHandler';
import { BlueprintDBService } from '../../../src/service/BlueprintDBService';

const db = mock(BlueprintDBService);
const handler = new SubscribeHandler(instance(db));

describe('Subscribe and Unsubscribe handler tests', () => {
    test('returns 400 if body is empty', async () => {
        // act
        const result = await handler.handle({} as APIGatewayProxyEvent, {} as Context);

        // assert
        expect(result.statusCode).toBe(400);
    });

    test('returns 400 if body contains mal-formed json', async () => {
        // act
        const result = await handler.handle(
            { body: '<html></html>' } as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(result.statusCode).toBe(400);
    });

    test('returns 400 if patternId is empty', async () => {
        // act
        const result = await handler.handle(
            { body: JSON.stringify({ test: 'value' }) } as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(result.statusCode).toBe(400);
    });

    test('returns 400 if email is invalid', async () => {
        // act
        const result = await handler.handle(
            {
                body: JSON.stringify({ patternId: 'value', email: 'invalid email' }),
            } as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(result.statusCode).toBe(400);
    });

    test('returns 404 on not implemented http methods', async () => {
        // act
        const result = await handler.handle(
            {
                body: JSON.stringify({
                    patternId: '1234',
                    email: 'mytestemail@test.com',
                }),
            } as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(result.statusCode).toBe(404);
    });

    test('can create new notification subscription', async () => {
        // arrange
        when(
            db.createNotificationSubscription('1234', 'mytestemail@test.com')
        ).thenResolve();

        // act
        const result = await handler.handle(
            {
                body: JSON.stringify({
                    patternId: '1234',
                    email: 'mytestemail@test.com',
                }),
                httpMethod: 'POST',
            } as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(result.statusCode).toBe(201);
    });

    test('can delete notification subscription', async () => {
        // arrange
        when(
            db.deleteNotificationSubscription('1234', 'mytestemail@test.com')
        ).thenResolve();

        // act
        const result = await handler.handle(
            {
                body: JSON.stringify({
                    patternId: '1234',
                    email: 'mytestemail@test.com',
                }),
                httpMethod: 'DELETE',
            } as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(result.statusCode).toBe(200);
    });
});
