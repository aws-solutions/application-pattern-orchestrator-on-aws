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
import { BasicHttpError } from '../../../src/common/common-types';
import responseFormatter from '../../../src/common/response-formatter';
import { Context, Callback } from 'aws-lambda';

describe('response format tests', () => {
    test('test success response formatting', async () => {
        const event = {
            testKey: 'TestVale',
        };
        const response = {
            statusCode: 200,
            body: 'Succeed',
        };

        const respFormatter = responseFormatter<typeof event, typeof response>({
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'extra-header': 'test value',
            },
        });

        const mockHandler: (
            _event: typeof event,
            _context: Context
        ) => Promise<typeof response> = jest.fn().mockResolvedValueOnce(response);
        const lambdaHandler = middy(mockHandler).use(respFormatter);

        const result = await lambdaHandler(
            event,
            {} as Context,
            (<unknown>null) as Callback<typeof response>
        );

        expect(result).toEqual({
            ...response,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            headers: { 'extra-header': 'test value' },
        });
    });

    test('test success response formatting with default config', async () => {
        const event = {
            testKey: 'TestVale',
        };
        const response = {
            statusCode: 200,
            body: 'Succeed',
        };

        const respFormatter = responseFormatter<typeof event, typeof response>();

        const mockHandler: (
            _event: typeof event,
            _context: Context
        ) => Promise<typeof response> = jest.fn().mockResolvedValueOnce(response);
        const lambdaHandler = middy(mockHandler).use(respFormatter);

        const result = await lambdaHandler(
            event,
            {} as Context,
            (<unknown>null) as Callback<typeof response>
        );

        expect(result).toEqual(response);
    });

    test('test http error response formatting', async () => {
        const event = {
            testKey: 'TestVale',
        };
        const response = {
            statusCode: 200,
            body: 'Succeed',
        };

        const respFormatter = responseFormatter<typeof event, typeof response>({
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'extra-header': 'test value',
            },
        });

        const mockHandler: (
            _event: typeof event,
            _context: Context
        ) => Promise<typeof response> = jest
            .fn()
            .mockRejectedValueOnce(new BasicHttpError(400, 'Error occurs'));
        const lambdaHandler = middy(mockHandler).use(respFormatter);

        const result = await lambdaHandler(
            event,
            {} as Context,
            (<unknown>null) as Callback<typeof response>
        );

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({ error: 'Error occurs', retryable: false }),
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'extra-header': 'test value',
            },
        });
    });

    test('test other error response formatting', async () => {
        const event = {
            testKey: 'TestVale',
        };
        const response = {
            statusCode: 200,
            body: 'Succeed',
        };

        const respFormatter = responseFormatter<typeof event, typeof response>({
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'extra-header': 'test value',
            },
        });

        const mockHandler: (
            _event: typeof event,
            _context: Context
        ) => Promise<typeof response> = jest.fn(() => {
            throw Error('Something is wrong');
        });
        const lambdaHandler = middy(mockHandler).use(respFormatter);

        const result = await lambdaHandler(
            event,
            {} as Context,
            (<unknown>null) as Callback<typeof response>
        );

        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: 'Something is wrong', retryable: false }),
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'extra-header': 'test value',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/json',
            },
        });
    });
});
