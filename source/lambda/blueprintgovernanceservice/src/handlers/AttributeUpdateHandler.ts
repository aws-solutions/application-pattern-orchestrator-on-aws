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
import { makeAttributeName, transformOutput } from '../common/Attribute';
import { AttributeBaseHandler } from '../common/AttributeBaseHandler';
import { Attribute, BasicHttpError, BasicHttpResponse } from '../common/common-types';
import { Logger, LoggerFactory } from '../common/logging';
import { isValidJSON } from '../common/Utils';
import { payloadValidator } from '../common/validator/AttributePayloadValidator';
import { BlueprintDBService } from '../service/BlueprintDBService';
import { AttributeInput, InputValidationResult } from '../types/BlueprintType';

/**
 * @api {put} /attributes/:id Update attribute
 * @apiName AttributeUpdate
 * @apiGroup Attribute
 * @apiDescription Update an existing attribute. This will replace the current attribute entirly, so all parameters need to be specified.
 * @apiVersion 1.0.0
 *
 * @apiUse AttributeParams
 *
 * @apiSuccess {String} name The name of the attribute
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
 *           "description": "The application that is mainly based on AWS Lambda Service",
 *           "metadata": {
 *              "notes": "Only use it for serverless application"
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

const handlerName = 'AttributeUpdateHandler';
@injectable()
export class AttributeUpdateHandler extends AttributeBaseHandler {
    private readonly logger: Logger;
    public validateInputPayload = payloadValidator;
    // validate attribute id
    private readonly validateIdParameter = this.validateAttributeIdInputParameter;

    /**
     * Creates an instance of Update Attribute request handler.
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

    public async process(event: APIGatewayProxyEvent): Promise<BasicHttpResponse> {
        const id = await this.getEntityId(event);
        this.logger.info(`${handlerName} Update Entity id:${id}`);

        const data = await this.prepareData(event, id);
        await this.blueprintDBService.updateAttribute(id, data);

        this.logger.info(`${handlerName} Post Update Entity id:${id}`);

        await this.postUpdate(id);

        this.logger.info(`${handlerName} Update Entity Success id:${id}`);
        return BasicHttpResponse.ofObject(
            200,
            await this.transformResult({ ...data, id })
        );
    }

    public validateInputParameters(
        event: APIGatewayProxyEvent,
        context: Context
    ): InputValidationResult {
        let validated = true;
        const errors: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!event || !event.body || !isValidJSON(event.body)) {
            validated &&= false;
            errors.push(
                'Valid JSON payload is required in the body of the update request.'
            );
        }

        const { validated: validatedId, errors: errorsId } = this.validateIdParameter(
            event,
            context
        );
        validated &&= validatedId;
        errors.push(...errorsId);

        return { validated, errors };
    }

    // get entity id
    private async getEntityId(event: APIGatewayProxyEvent): Promise<string> {
        return decodeURIComponent(event.pathParameters?.id ?? '').toUpperCase();
    }

    public async prepareData(
        event: APIGatewayProxyEvent,
        id: string
    ): Promise<Attribute> {
        // retrieve the item to update
        const checkItem = await this.blueprintDBService.getAttributeById(id);
        if (!checkItem || !('id' in checkItem)) {
            // the specified item not found
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BasicHttpError(404, `Specified attribute is not found. id: ${id}`);
        }

        const payload = JSON.parse(event.body || '') as AttributeInput;

        // the key and value are not allowed to be changed.
        if (
            payload.key.toUpperCase() !== checkItem.key.toUpperCase() ||
            payload.value.toUpperCase() !== checkItem.value.toUpperCase()
        ) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BasicHttpError(
                404,
                `The key and value are not allowed to be updated. Current Key: ${checkItem.key}, Value: ${checkItem.value}`
            );
        }

        // prepare new item data to replace the existing one
        return {
            id,
            name: makeAttributeName(payload.key, payload.value),
            description: payload.description ?? '',
            key: payload.key,
            value: payload.value,
            metadata: payload.metadata,
            keyIndex: payload.key.toUpperCase(),
            createTime: checkItem.createTime,
            lastUpdateTime: new Date().toISOString(),
        };
    }

    // update associated data after the data is written into dynamodb
    public async postUpdate(id: string): Promise<void> {
        // add the appregistry sync request to the queue
        await addSyncRequestToQueue(id);
    }

    public async transformResult(item: Attribute): Promise<Partial<Attribute>> {
        return transformOutput(item);
    }
}
