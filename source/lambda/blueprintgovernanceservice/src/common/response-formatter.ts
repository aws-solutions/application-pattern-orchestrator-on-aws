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
import { BasicHttpResponse, BasicHttpError } from './common-types';

type ConfigType = {
    headers: Record<string, string>;
};
const defaultConfig: ConfigType = {
    headers: {},
};
const responseFormatter = <T, R>(
    config: ConfigType = defaultConfig
): middy.MiddlewareObj<T, R> => {
    const addHeaders = (
        request: middy.Request,
        additonalHeaders?: Record<string, string>
    ): void => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        request.response.headers = Object.assign(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            request?.response?.headers || {},
            additonalHeaders
        );
    };

    const after: middy.MiddlewareFn<T, R> = async (request): Promise<void> => {
        addHeaders(request, config.headers);
    };

    const onError: middy.MiddlewareFn<T, R> = async (request): Promise<void> => {
        if (request.error instanceof BasicHttpError) {
            request.response = BasicHttpResponse.ofError(request.error) as unknown as R;
            addHeaders(request, config.headers);
        } else {
            // other exceptions, respond with 500 - Internal Server Error
            request.response = BasicHttpResponse.ofError(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                BasicHttpError.internalServerError(request.error!.message)
            ) as unknown as R;
        }
    };

    return {
        after,
        onError,
    };
};

export default responseFormatter;
