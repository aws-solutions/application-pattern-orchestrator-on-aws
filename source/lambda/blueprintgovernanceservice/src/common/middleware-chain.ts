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
import { Context, Callback } from 'aws-lambda';
import middy from '@middy/core';

export type LambdaHandler<T, R, C extends Context = Context> = (
    event: T,
    context: C,
    callback: Callback<R>
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => void | Promise<R>;

type AsyncHandler<T, R, C extends Context> = (event: T, context: C) => Promise<R>;

export interface AsyncHandlerObj<T, R, C extends Context = Context> {
    handle: AsyncHandler<T, R, C>;
}

export class MiddlewareChain<T, R, C extends Context = Context> {
    public readonly lambdaHandler: LambdaHandler<T, R, C>;
    public constructor(
        asyncHandlerObj: AsyncHandlerObj<T, R, C>,
        middlewares: middy.MiddlewareObj<T, R>[]
    ) {
        const middyHandler = middy(
            asyncHandlerObj.handle.bind(asyncHandlerObj) as AsyncHandler<T, R, Context>
        );
        middyHandler.use(middlewares);
        // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
        this.lambdaHandler = (event: T, context: C): Promise<R> | void =>
            middyHandler(event, context, (<unknown>null) as Callback<R>);
    }
}
