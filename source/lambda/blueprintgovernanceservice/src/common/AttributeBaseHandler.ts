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

import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { AsyncRequestHandler } from '../common/AsyncRequestHandler';
import { ServerlessResponse } from '../common/ServerlessResponse';
import { InputValidationResult } from '../types/BlueprintType';
import { BasicHttpError, BasicHttpResponse } from './common-types';

/**
 * Base class for Attribute Handlers
 */

/**
 * @apiDefine InvalidParams
 *
 * @apiError (Error 400 - Bad Request) {String} error Error message
 * @apiError (Error 400 - Bad Request) {Boolean} retryable Indicate if the request can be retryable
 * @apiErrorExample {json} Error-Response-400
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "error": "Invalid attribute id. The attribute id must match /^[-\\w]{1,120}:[-\\w]{1,120}$/."",
 *          "retryable": false
 *      }
 */

/**
 * @apiDefine PaginationParams [pagination control]
 *
 * @apiParam (Optional Query Parameters) {Number=1-1000} [maxRow=100] Maximum number of rows in the response page
 * @apiParam (Optional Query Parameters) {String} [nextToken] Specify the value of the <code>nextToken</code> field in the last response to get the next page.
 *
 */

/**
 * @apiDefine NotFound
 *
 * @apiError (Error 404 - Not Found) {String} error Error message
 * @apiError (Error 404 - Not Found) {Boolean} retryable Indicate if the request can be retryable
 * @apiErrorExample {json} Error-Response-404
 *      HTTP/1.1 404 Not Found
 *      {
 *          "error": "Specified item is not found. id: TestKey:TestValue",
 *          "retryable": false
 *      }
 */

/**
 * @apiDefine InternalServerError
 *
 * @apiError (Error 500 - Internal Server Error) {String} error Error message
 * @apiError (Error 500 - Internal Server Error) {Boolean} retryable Indicate if the request can be retryable
 * @apiErrorExample {json} Error-Response-500
 *      HTTP/1.1 500 Internal Server Error
 *      {
 *          "error": "Connection failure.",
 *          "retryable": false
 *      }
 */
export abstract class AttributeBaseHandler
    implements AsyncRequestHandler<APIGatewayProxyEvent, ServerlessResponse>
{
    /**
     * Request handler
     * @param event - lambda event
     * @param context - lambda context
     * @returns handle
     */
    public async handle(
        event: APIGatewayProxyEvent,
        context: Context
    ): Promise<ServerlessResponse> {
        const { validated, errors } = this.validate(event, context);
        if (validated) {
            return this.process(event, context);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BasicHttpError(400, errors.join('; '), false);
        }
    }

    // abstract methods that need to be implemented by each resource handle
    public abstract validateInputParameters(
        event: APIGatewayProxyEvent,
        context: Context
    ): InputValidationResult;

    public abstract process(
        event: APIGatewayProxyEvent,
        context: Context
    ): Promise<BasicHttpResponse>;

    public validate(
        event: APIGatewayProxyEvent,
        context: Context
    ): InputValidationResult {
        let validated = true;
        const errors: string[] = [];

        const { validated: validatedParams, errors: errorsParams } =
            this.validateInputParameters(event, context);
        validated &&= validatedParams;
        errors.push(...errorsParams);

        if (validated) {
            const { validated: validatedPayload, errors: errorsPayload } =
                this.validateInputPayload(event, context);

            validated &&= validatedPayload;
            errors.push(...errorsPayload);
        }

        return { validated, errors };
    }

    public validateInputPayload(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): InputValidationResult {
        return { validated: true, errors: [] };
    }

    // validate attribute id
    public validateAttributeIdInputParameter(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): InputValidationResult {
        const regAttributeId = /^[-\w]{1,120}:[-\w]{1,120}$/;
        let validated = true;
        const errors: string[] = [];
        if (
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            !event ||
            !event.pathParameters ||
            !event.pathParameters.id ||
            !regAttributeId.test(decodeURIComponent(event.pathParameters.id))
        ) {
            validated &&= false;
            errors.push(
                `Invalid attribute id. The attribute id must match ${regAttributeId}.`
            );
        }
        return { validated, errors };
    }
}
