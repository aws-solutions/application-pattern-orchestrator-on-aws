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
import { inject, injectable } from 'tsyringe';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { Logger, LoggerFactory } from '../common/logging';
import { ServerlessResponse } from '../common/ServerlessResponse';
import { addSyncRequestToQueue } from '../common/AppRegistrySyncRequestQueue';
import { BlueprintDBService } from '../service/BlueprintDBService';
import { AttributeInput, InputValidationResult } from '../types/BlueprintType';
import { payloadValidator } from '../common/validator/AttributePayloadValidator';
import { isValidJSON } from '../common/Utils';
import { makeAttributeId, makeAttributeName, transformOutput } from '../common/Attribute';
import { Attribute, BasicHttpError } from '../common/common-types';
import { AttributeBaseHandler } from '../common/AttributeBaseHandler';
import {
    MetricsPayload,
    sendAnonymousMetric,
} from '../common/metrics/operational-metric';

/**
 * @api {post} /attributes Create attribute
 * @apiName AttributeCreate
 * @apiGroup Attribute
 * @apiDescription Create a new attribute
 * @apiVersion 1.0.0
 *
 * @apiUse AttributeParams
 *
 * @apiSuccess (Success 201) {String} name The name of the attribute
 * @apiSuccess (Success 201) {String} description The description of the attribute
 * @apiSuccess (Success 201) {String} key The key of the attribute
 * @apiSuccess (Success 201) {String} value The value of the attribute
 * @apiSuccess (Success 201) {Object} metadata The metadata of the attribute
 * @apiSuccess (Success 201) {String} createTime The timestamp when the attribute is created
 * @apiSuccess (Success 201) {String} lastUpdateTime The timestamp when the attribute is updated last time
 *
 * @apiSuccessExample Success-Response:
 *      HTTP/1.1 201 Created
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
 *  @apiUse InternalServerError
 *  @apiSampleRequest off
 */

const handlerName = 'AttributeCreateHandler';

@injectable()
export class AttributeCreateHandler extends AttributeBaseHandler {
    private readonly logger: Logger;

    /**
     * Creates an instance of Attribute create request handler.
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

    public validateInputPayload = payloadValidator;

    public async process(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): Promise<ServerlessResponse> {
        const id = await this.getEntityId(event);
        this.logger.info(`${handlerName} Create Entity id:${id}`);

        const data = await this.prepareData(event);
        await this.blueprintDBService.createAttribute(id, data);

        this.logger.info(`${handlerName} Post Update Entity id:${id}`);
        await this.postUpdate(id);

        this.logger.info(`${handlerName} Create Entity Success id:${id}`);

        // send operation metrics
        if (
            process.env.ANONYMOUS_DATA_UUID &&
            process.env.SOLUTION_ID &&
            process.env.SOLUTION_VERSION
        ) {
            const operationalMetric: MetricsPayload = {
                awsSolutionId: process.env.SOLUTION_ID,
                awsSolutionVersion: process.env.SOLUTION_VERSION,
                anonymousDataUUID: process.env.ANONYMOUS_DATA_UUID,
                data: {
                    attributeCreated: 1,
                },
            };
            sendAnonymousMetric(operationalMetric);
        }

        return ServerlessResponse.ofObject(
            201,
            await this.transformResult({ ...data, id })
        );
    }

    public validateInputParameters(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): InputValidationResult {
        let validated = true;
        const errors: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!event || !event.body || !isValidJSON(event.body)) {
            validated &&= false;
            errors.push(
                'Valid JSON payload is required in the body of the create request.'
            );
        }
        return { validated, errors };
    }

    private async getEntityId(event: APIGatewayProxyEvent): Promise<string> {
        const payload = JSON.parse(event.body || '') as Required<AttributeInput>;
        const id = makeAttributeId(payload.key, payload.value);

        // verify attribute doesn't exist
        const attribute = await this.blueprintDBService.getAttributeById(id);
        if (attribute && 'id' in attribute) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BasicHttpError(
                400,
                `An attribute with the specific key and value already exists.`
            );
        }
        return id;
    }

    public async prepareData(event: APIGatewayProxyEvent): Promise<Attribute> {
        const payload = JSON.parse(event.body || '') as Required<AttributeInput>;

        // prepare new item data
        return {
            id: makeAttributeId(payload.key, payload.value),
            name: makeAttributeName(payload.key, payload.value),
            description: payload.description,
            key: payload.key,
            value: payload.value,
            metadata: payload.metadata,
            keyIndex: payload.key.toUpperCase(),
            createTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
        };
    }

    // update associated data after the data is written into dynamodb
    private async postUpdate(id: string): Promise<void> {
        // add the appregistry sync request to the queue
        await addSyncRequestToQueue(id);
    }

    private async transformResult(item: Attribute): Promise<Partial<Attribute>> {
        return transformOutput(item);
    }
}
