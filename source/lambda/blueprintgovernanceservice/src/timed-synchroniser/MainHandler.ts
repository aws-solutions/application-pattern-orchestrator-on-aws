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

import middy from '@middy/core';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { getLogger } from '../common/BaseContainer';
import { BasicHttpResponse } from '../common/common-types';
import { AppConfiguration } from '../common/configuration/AppConfiguration';
import { ContextLoggingMiddleware } from '../common/logging';
import { LambdaHandler, MiddlewareChain } from '../common/middleware-chain';
import responseFormatter from '../common/response-formatter';
import { EventType, SyncEventHandler } from './SyncEventHandler';

export class MainHandler {
    public readonly lambdaHandler: LambdaHandler<EventType, BasicHttpResponse>;
    public constructor(handler: SyncEventHandler) {
        const appConfig = container.resolve<AppConfiguration>('AppConfiguration');
        const middlewares = [
            ContextLoggingMiddleware<EventType, BasicHttpResponse>(
                appConfig.applicationName,
                container,
                appConfig.runningLocally,
                appConfig.logLevel
            ),
            responseFormatter<EventType, BasicHttpResponse>(),
            errorLogger<EventType, BasicHttpResponse>(),
        ];

        // main lambda handler
        this.lambdaHandler = new MiddlewareChain<EventType, BasicHttpResponse>(
            handler,
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

// main lambda handler
const eventHandler = new SyncEventHandler();
export const lambdaHandler = new MainHandler(eventHandler).lambdaHandler;
