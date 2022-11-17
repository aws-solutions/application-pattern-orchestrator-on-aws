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
import { anything, instance, mock, when } from 'ts-mockito';
import { GetSubscriptionHandler } from '../../../src/handlers/GetSubscriptionHandler';
import { BlueprintDBService } from '../../../src/service/BlueprintDBService';

const db = mock(BlueprintDBService);
const handler = new GetSubscriptionHandler(instance(db));

describe('Get subscription handler tests', () => {
    test('returns 400 if patternid or email is missing', async () => {
        // act
        const result = await handler.handle({} as APIGatewayProxyEvent, {} as Context);

        // assert
        expect(result.statusCode).toBe(400);
    });

    test('returns 404 if not found', async () => {
        // arrange
        when(db.getNotificationSubscription(anything(), anything())).thenResolve(
            undefined
        );

        // act
        const result = await handler.handle(
            {
                queryStringParameters: { patternId: '1234', email: 'test' },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(result.statusCode).toBe(404);
    });

    test('can get notification subs', async () => {
        // arrange
        when(db.getNotificationSubscription(anything(), anything())).thenResolve({});

        // act
        const result = await handler.handle(
            {
                queryStringParameters: { patternId: '1234', email: 'test' },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );

        // assert
        expect(result.statusCode).toBe(200);
    });
});
