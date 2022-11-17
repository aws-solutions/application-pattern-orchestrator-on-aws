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

// APIGatewayProxyResult has all the fields that is needed for a BasicHTTPResponse type.
// re-export as a generic type
import { APIGatewayProxyResult } from 'aws-lambda';

const jsonContentTypeHeader = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'Content-Type': 'application/json',
};
const textContentTypeHeader = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'Content-Type': 'text/plain',
};

export class BasicHttpResponse implements APIGatewayProxyResult {
    public constructor(
        public statusCode: number,
        public body: string = '',
        public headers?: Record<string, boolean | number | string>
    ) {
        this.body = body;
        this.statusCode = statusCode;
        this.headers = headers;
    }

    public addHeaders(
        headers: Record<string, boolean | number | string>
    ): BasicHttpResponse {
        this.headers = Object.assign(this.headers || {}, headers);
        return this;
    }

    public static ofError(error: BasicHttpError): BasicHttpResponse {
        return new BasicHttpResponse(
            error.statusCode,
            JSON.stringify({
                error: error.message,
                retryable: error.retryable,
            }),
            jsonContentTypeHeader
        );
    }

    public static ofRecord(
        statusCode: number,
        data: Record<string, unknown>
    ): BasicHttpResponse {
        return new BasicHttpResponse(
            statusCode,
            JSON.stringify(data),
            jsonContentTypeHeader
        );
    }

    public static ofString(statusCode: number, message: string): BasicHttpResponse {
        return new BasicHttpResponse(statusCode, message, textContentTypeHeader);
    }

    public static ofObject<T>(statusCode: number, value: T): BasicHttpResponse {
        return new BasicHttpResponse(
            statusCode,
            JSON.stringify(value),
            jsonContentTypeHeader
        );
    }
}

// Basic runtime error
export class BasicHttpError implements Error {
    public name = 'BasicHttpError';
    public constructor(
        public statusCode: number,
        public message: string = '',
        public retryable: boolean = false
    ) {
        this.statusCode = statusCode;
        this.message = message;
        this.retryable = retryable;
    }

    public static internalServerError(message: string): BasicHttpError {
        return new BasicHttpError(500, message, false);
    }
}

// Paginated results for API
export interface PaginatedResults<T> {
    results: T[];
    nextToken?: string;
}

export type PatternType = 'CDK' | 'CFN';

export interface Attribute {
    id: string;
    name: string;
    description: string;
    key: string;
    value: string;
    metadata?: Record<string, string>;
    keyIndex: string;
    createTime: string;
    lastUpdateTime: string;
}
