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
import { addSyncRequestToQueue } from '../common/AppRegistrySyncRequestQueue';
import { AttributeBaseHandler } from '../common/AttributeBaseHandler';
import { BasicHttpError, BasicHttpResponse } from '../common/common-types';
import { Logger, LoggerFactory } from '../common/logging';
import { BlueprintDBService } from '../service/BlueprintDBService';
import { BlueprintObject } from '../types/BlueprintType';

/**
 * @api {delete} /attributes/:id Delete attribute
 * @apiName AttributeDelete
 * @apiGroup Attribute
 * @apiDescription Delete an existing attribute.
 * @apiVersion 1.0.0
 *
 * @apiParam {String} id id or name of the attribute
 *
 * @apiSuccess {String} id The id of the deleted attribute
 *
 * @apiSuccessExample Success-Response:
 *      HTTP/1.1 200 OK
 *      {
 *           "id": "HOSTINGCONSTRUCT:EC2",
 *       }
 *
 *  @apiUse InvalidParams
 *  @apiUse NotFound
 *  @apiUse InternalServerError
 *  @apiSampleRequest off
 */

const handlerName = 'AttributeDeleteHandler';
@injectable()
export class AttributeDeleteHandler extends AttributeBaseHandler {
    private readonly logger: Logger;
    public validateInputParameters = this.validateAttributeIdInputParameter;

    /**
     * Creates an instance of Attribute delete request handler.
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

    public async process(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): Promise<BasicHttpResponse> {
        const id = await this.getEntityId(event);
        this.logger.info(`${handlerName} Delete Entity id:${id}`);

        await this.blueprintDBService.deleteAttribute(id);

        this.logger.info(`${handlerName} Post Delete Entity id:${id}`);
        await this.postUpdate(id);

        this.logger.info(`${handlerName} Delete Entity Success id:${id}`);
        return BasicHttpResponse.ofObject(200, { id });
    }

    private async getEntityId(event: APIGatewayProxyEvent): Promise<string> {
        const id = decodeURIComponent(event.pathParameters?.id ?? '').toUpperCase();

        // check attribute exists before deleting
        const item = await this.blueprintDBService.getAttributeById(id);
        if (!item || !('id' in item)) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BasicHttpError(404, `Specified attribute is not found. id: ${id}`);
        }
        // check attribute is not used by existing patterns
        let patternsList: BlueprintObject[] = [];
        let nextTokenValue: string | undefined;
        do {
            const { results, nextToken } = await this.blueprintDBService.listBlueprints(
                100,
                nextTokenValue
            );
            patternsList = patternsList.concat(results);
            nextTokenValue = nextToken;
        } while (nextTokenValue);

        const patternAlreadyAssociated = patternsList.find(
            (pattern) =>
                pattern.attributes &&
                Object.entries(pattern.attributes).find(
                    ([key, value]) => key === item.key && value === item.value
                )
        );
        if (patternAlreadyAssociated) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BasicHttpError(
                400,
                `Specified attribute is in use and can not be deleted. id: ${id}`
            );
        }
        return id;
    }

    // update associated data after the data is written into dynamodb
    private async postUpdate(id: string): Promise<void> {
        // add the appregistry sync request to the queue
        await addSyncRequestToQueue(id);
    }
}
