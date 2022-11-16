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
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { DependencyContainer } from 'tsyringe';
import { LambdaLoggerFactory, LoggerFactory } from './logger-factory';
import { LogLevelType } from './logger-type';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function ContextLoggingMiddleware<TEvent, TResponse>(
    applicationName: string,
    rootContainer: DependencyContainer,
    runningLocally?: boolean,
    logLevel?: LogLevelType,
    additionalMetadata?: Record<
        string,
        (event: APIGatewayProxyEvent, context: Context) => string
    >
): middy.MiddlewareObj<TEvent, TResponse> {
    const before: middy.MiddlewareFn<TEvent, TResponse> = async (
        request
    ): Promise<void> => {
        const logMetadata: Record<string, (event: TEvent, context: Context) => string> = {
            ...additionalMetadata,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            applicationName: (_e, _c) => applicationName,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            resource: (e, _c) => (e as unknown as APIGatewayProxyEvent).resource,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            httpMethod: (e, _c) => (e as unknown as APIGatewayProxyEvent).httpMethod,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            awsRequestId: (_e, c) => c.awsRequestId,
            // eslint-disable-next-line
            lambdaRequestId: (e, _c) =>
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                (e as unknown as APIGatewayProxyEvent).requestContext?.requestId,
        };

        const loggerFactory = new LambdaLoggerFactory(
            request.event,
            request.context,
            runningLocally,
            logMetadata,
            logLevel
        );

        const loggingContextContainer = rootContainer.createChildContainer();
        loggingContextContainer.registerInstance<LoggerFactory>(
            'LoggerFactory',
            loggerFactory
        );
        const loggingContext: LoggingContext = {
            ...request.context,
            loggingContextContainer,
        };

        request.context = loggingContext;
    };

    const after: middy.MiddlewareFn<TEvent, TResponse> = async (
        request
    ): Promise<void> => {
        (request.context as LoggingContext).loggingContextContainer.clearInstances();
    };

    const onError: middy.MiddlewareFn<TEvent, TResponse> = async (
        request
    ): Promise<void> => {
        (request.context as LoggingContext).loggingContextContainer.clearInstances();
    };

    return {
        before,
        after,
        onError,
    };
}

export interface LoggingContext extends Context {
    loggingContextContainer: DependencyContainer;
}
