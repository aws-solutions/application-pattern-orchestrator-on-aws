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
import { inject, injectable } from 'tsyringe';
import { transformOutput } from '../common/Attribute';
import { AttributeBaseHandler } from '../common/AttributeBaseHandler';
import { Attribute, BasicHttpError, BasicHttpResponse } from '../common/common-types';
import { Logger, LoggerFactory } from '../common/logging';
import { BlueprintDBService } from '../service/BlueprintDBService';

/**
 * @api {get} /attributes/:id Get attribute details
 * @apiName AttributeDetailGet
 * @apiGroup Attribute
 * @apiDescription Get details of an attribute
 * @apiVersion 1.0.0
 *
 * @apiParam {String} id id or name of the attribute
 *
 * @apiSuccess {String} name The name of the attribute.
 * @apiSuccess {String} description The description of the attribute
 * @apiSuccess {String} key The key of the attribute
 * @apiSuccess {String} value The value of the attribute
 * @apiSuccess {Object} metadata The metadata of the attribute
 * @apiSuccess {String} createTime The timestamp when the attribute is created
 * @apiSuccess {String} lastUpdateTime The timestamp when the attribute is updated last time
 *
 * @apiSuccessExample Success-Response:
 *      HTTP/1.1 200 OK
 *      {
 *           "name": "hostingConstruct:Lambda",
 *           "key": "hostingConstruct"
 *           "value": "Lambda"
 *           "description": "The pattern that is mainly based on AWS Lambda Service",
 *           "metadata": {
 *              "notes": "Only use it for serverless patterns"
 *           },
 *           "createTime": "2021-05-17T07:04:24.102Z",
 *           "lastUpdateTime": "2021-05-17T07:04:24.102Z"
 *       }
 *
 *  @apiUse InvalidParams
 *  @apiUse NotFound
 *  @apiUse InternalServerError
 *  @apiSampleRequest off
 */

const handlerName = 'AttributeGetDetailsHandler';
@injectable()
export class AttributeGetDetailsHandler extends AttributeBaseHandler {
    private readonly logger: Logger;

    /**
     * Creates an instance of Attribute delete request handler.
     * @param loggerFactory
     */
    public constructor(
        @inject('LoggerFactory') loggerFactory: LoggerFactory,
        @inject('BlueprintDBService')
        private readonly blueprintDBService: BlueprintDBService
    ) {
        super();
        this.logger = loggerFactory.getLogger(handlerName);
    }

    public validateInputParameters = this.validateAttributeIdInputParameter;

    public async process(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): Promise<BasicHttpResponse> {
        const id = await this.getEntityId(event);
        this.logger.info(`${handlerName} Get Entity Details id:${id}`);

        const item = await this.blueprintDBService.getAttributeById(id);
        if (item && 'id' in item) {
            return BasicHttpResponse.ofObject(200, await this.transformResult(item));
        } else {
            // the specified item not found
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BasicHttpError(404, `Specified item is not found. id: ${id}`);
        }
    }

    // get entity id
    private async getEntityId(event: APIGatewayProxyEvent): Promise<string> {
        return decodeURIComponent(event.pathParameters?.id ?? '').toUpperCase();
    }

    private async transformResult(item: Attribute): Promise<Partial<Attribute>> {
        return transformOutput(item);
    }
}
