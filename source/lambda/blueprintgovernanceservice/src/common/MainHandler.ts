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
import { container } from 'tsyringe';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { MiddlewareChain, LambdaHandler } from './middleware-chain';
import { Router } from './router/Router';
import { BasicHttpResponse } from '../common/common-types';
import responseFormatter from './response-formatter';
import cors from '@middy/http-cors';
import { ContextLoggingMiddleware } from './logging';
import { AppConfiguration } from './configuration/AppConfiguration';
import middy from '@middy/core';
import { getLogger } from './BaseContainer';

export class MainHandler {
    public readonly lambdaHandler: LambdaHandler<
        APIGatewayProxyEvent,
        BasicHttpResponse,
        Context
    >;
    public constructor(router: Router<BasicHttpResponse>) {
        // setup middlewares
        const appConfig = container.resolve<AppConfiguration>('AppConfiguration');

        const middlewares = [
            ContextLoggingMiddleware<APIGatewayProxyEvent, BasicHttpResponse>(
                appConfig.applicationName,
                container,
                appConfig.runningLocally,
                appConfig.logLevel
            ),
            responseFormatter<APIGatewayProxyEvent, BasicHttpResponse>(),
            errorLogger<APIGatewayProxyEvent, BasicHttpResponse>(),
            cors(),
        ];

        // main lambda handler
        this.lambdaHandler = new MiddlewareChain<APIGatewayProxyEvent, BasicHttpResponse>(
            router,
            middlewares
        ).lambdaHandler;
    }
}

function errorLogger<TEvent, TResponse>(): middy.MiddlewareObj<TEvent, TResponse> {
    const onError: middy.MiddlewareFn<TEvent, TResponse> = async (
        request
    ): Promise<void> => {
        const logger = getLogger('ErrorLoggingMiddleware');

        logger.error('Error received - ', request.error);
    };

    return {
        onError,
    };
}
