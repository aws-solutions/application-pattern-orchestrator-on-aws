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
import _ from 'lodash';
import { inject, injectable } from 'tsyringe';
import { transformOutput } from '../common/Attribute';
import { AttributeBaseHandler } from '../common/AttributeBaseHandler';
import { Attribute, BasicHttpResponse, PaginatedResults } from '../common/common-types';
import { Logger, LoggerFactory } from '../common/logging';
import { BlueprintDBService } from '../service/BlueprintDBService';
import { InputValidationResult, QueryResult } from '../types/BlueprintType';

/**
 * @api {get} /attributes List attributes
 * @apiName AttributeList
 * @apiGroup Attribute
 * @apiDescription List all attributes
 * @apiVersion 1.0.0
 *
 * @apiUse PaginationParams
 * @apiParam (Optional Query Parameters) {String} [key] Specify key name to retrieve attributes that have the given key.
 *
 * @apiSuccess {Object[]} results results
 * @apiSuccess {String} results.name The name of the attribute
 * @apiSuccess {String} results.description The description of the attribute
 * @apiSuccess {String} results.key The key of the attribute
 * @apiSuccess {String} results.value The value of the attribute
 * @apiSuccess {Object} results.metadata The metadata of the attribute
 * @apiSuccess {String} results.createTime The timestamp when the attribute is created
 * @apiSuccess {String} results.lastUpdateTime The timestamp when the attribute is updated last time
 * @apiSuccess {UUID} [nextToken] The token for retrieving next page
 *
 * @apiSuccessExample Success-Response:
 *      HTTP/1.1 200 OK
 *      {
 *        "results": [
 *            {
 *               "name": "hostingConstruct:Lambda",
 *               "key": "hostingConstruct"
 *               "value": "Lambda"
 *               "description": "The pattern that is mainly based on AWS Lambda Service",
 *               "metadata": {
 *                  "notes": "Only use it for serverless pattern"
 *               },
 *               "createTime": "2021-05-17T07:04:24.102Z",
 *               "lastUpdateTime": "2021-05-17T07:04:24.102Z"
 *            },
 *            {
 *               "name": "hostingConstruct:EC2",
 *               "key": "hostingConstruct"
 *               "value": "EC2"
 *               "description": "The pattern that is mainly based on AWS EC2",
 *               "metadata": {
 *                  "notes": "Only use it for pattern that requires linux OS"
 *               },
 *               "createTime": "2021-05-17T07:04:24.102Z",
 *               "lastUpdateTime": "2021-05-17T07:04:24.102Z"
 *            },
 *        ],
 *        "nextToken": "5f55c3f4-792e-4ae0-a7a5-76541f8d5ebb"
 *      }
 *
 *  @apiUse InvalidParams
 *  @apiUse InternalServerError
 *  @apiSampleRequest off
 */

const defaultMaxRow = 100;

const handlerName = 'AttributeListHandler';
@injectable()
export class AttributeListHandler extends AttributeBaseHandler {
    private readonly logger: Logger;

    /**
     * Creates an instance of List Attribute request handler.
     * @param loggerFactory
     * @param blueprintDBService
     */
    public constructor(
        @inject('LoggerFactory') loggerFactory: LoggerFactory,
        @inject('BlueprintDBService')
        private readonly blueprintDBService: BlueprintDBService
    ) {
        super();
        this.logger = loggerFactory.getLogger(handlerName);
    }

    public validateInputParameters = (
        event: APIGatewayProxyEvent,
        context: Context
    ): InputValidationResult => {
        let validated = true;
        const errors: string[] = [];
        const results = this.validateQueryParameters(event, context);
        if (!results.validated) {
            validated &&= false;
            errors.push(...results.errors);
        }

        if (event.queryStringParameters) {
            const parameterNames = Object.keys(event.queryStringParameters);
            const invalidParams = _.difference(parameterNames, ['maxRow', 'nextToken']);
            if (invalidParams.length > 0) {
                validated &&= false;
                errors.push(
                    `Unsupported query parameter. Query Parameters: ${invalidParams.join(
                        ','
                    )}`
                );
            }
        }

        return { validated, errors };
    };

    public validateQueryParameters(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): InputValidationResult {
        let validated = true;
        const errors: string[] = [];
        if (event.queryStringParameters?.maxRow) {
            const maxRow = event.queryStringParameters.maxRow;
            if (
                !/^\d+$/.test(maxRow) ||
                parseInt(maxRow) <= 0 ||
                parseInt(maxRow) >= 1000
            ) {
                validated &&= false;
                errors.push(
                    'The maxRow must be an integer between 1 and 1000. If not specified, the default value is 100.'
                );
            }
        }

        if (event.queryStringParameters?.nextToken) {
            const nextToken = decodeURIComponent(
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                event.queryStringParameters.nextToken ?? ''
            );
            if (nextToken.trim().length === 0) {
                validated &&= false;
                errors.push(
                    'The nextToken must be the value from the last response received.'
                );
            }
        }
        return { validated, errors };
    }

    private async transformResults(
        results: Attribute[],
        nextToken: string | undefined
    ): Promise<PaginatedResults<Partial<Attribute>>> {
        return {
            results: results.map((item) => ({
                ...transformOutput(item),
            })),
            nextToken,
        };
    }

    public async process(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): Promise<BasicHttpResponse> {
        const maxRow = Math.min(
            +(event.queryStringParameters?.['maxRow'] || defaultMaxRow.toString()),
            defaultMaxRow
        );
        const previousToken = event.queryStringParameters?.['nextToken']
            ? decodeURIComponent(event.queryStringParameters['nextToken'])
            : undefined;

        this.logger.info(`${handlerName} List Entity`);

        const data: QueryResult = await this.doFetchAttributes(maxRow, previousToken);

        return BasicHttpResponse.ofObject(
            200,
            await this.transformResults(data[0], data[1])
        );
    }

    private async doFetchAttributes(
        maxRow: number,
        previousToken?: string
    ): Promise<[Attribute[], string]> {
        this.logger.info(`${defaultMaxRow} fetch page starts from ${previousToken}`);
        return this.blueprintDBService.listAttributes(maxRow, previousToken);
    }
}
