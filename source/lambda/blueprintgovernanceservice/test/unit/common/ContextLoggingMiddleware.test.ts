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
import { DependencyContainer, container } from 'tsyringe';
import { instance, mock, when } from 'ts-mockito';
import middy from '@middy/core';
import { ContextLoggingMiddleware } from '../../../src/common/logging';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { BasicHttpResponse } from '../../../src/common/common-types';

/* eslint-disable @typescript-eslint/no-non-null-assertion */
describe('ContextLoggingMiddleware tests', () => {
    test('should initiate logger factory and register child container', () => {
        // arrange
        const rootContainer = mock<DependencyContainer>();
        when(rootContainer.createChildContainer()).thenReturn(container);
        const request: middy.Request<
            APIGatewayProxyEvent,
            BasicHttpResponse,
            Error,
            Context
        > = {
            event: {
                resource: 'testResource',
                httpMethod: 'GET',
                requestContext: { requestId: '12345' },
            } as APIGatewayProxyEvent,
            context: { awsRequestId: '87654' } as Context,
            response: {} as BasicHttpResponse,
            error: {} as Error,
            internal: {},
        };

        const middleware = ContextLoggingMiddleware<
            APIGatewayProxyEvent,
            BasicHttpResponse
        >('testApp', instance(rootContainer));

        // act
        middleware.before!(request);

        // assert
        const loggerFactory = container.resolve('LoggerFactory');
        expect(loggerFactory).toBeDefined();
    });

    test('should clear instances from ioc container', () => {
        // arrange
        const rootContainer = mock<DependencyContainer>();
        when(rootContainer.createChildContainer()).thenReturn(container);
        const request: middy.Request<
            APIGatewayProxyEvent,
            BasicHttpResponse,
            Error,
            Context
        > = {
            event: {} as APIGatewayProxyEvent,
            context: {} as Context,
            response: {} as BasicHttpResponse,
            error: {} as Error,
            internal: {},
        };

        const middleware = ContextLoggingMiddleware<
            APIGatewayProxyEvent,
            BasicHttpResponse
        >('testApp', instance(rootContainer));

        // act
        middleware.before!(request);
        middleware.after!(request);

        // assert
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        const loggerFactory = () => container.resolve('LoggerFactory');
        expect(loggerFactory).toThrowError();
    });

    test('should clear instances from ioc container on error', () => {
        // arrange
        const rootContainer = mock<DependencyContainer>();
        when(rootContainer.createChildContainer()).thenReturn(container);
        const request: middy.Request<
            APIGatewayProxyEvent,
            BasicHttpResponse,
            Error,
            Context
        > = {
            event: {} as APIGatewayProxyEvent,
            context: {} as Context,
            response: {} as BasicHttpResponse,
            error: {} as Error,
            internal: {},
        };
        const middleware = ContextLoggingMiddleware<
            APIGatewayProxyEvent,
            BasicHttpResponse
        >('testApp', instance(rootContainer));

        // act
        middleware.before!(request);
        middleware.onError!(request);

        // assert
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        const loggerFactory = () => container.resolve('LoggerFactory');
        expect(loggerFactory).toThrowError();
    });
});
