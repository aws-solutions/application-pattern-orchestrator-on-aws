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
import { inject, injectable } from 'tsyringe';
import { ServerlessResponse } from '../common/ServerlessResponse';
import { Logger, LoggerFactory } from '../common/logging';
import { BlueprintDBService } from '../service/BlueprintDBService';

/**
 * Update pattern metadata request interface
 */
export interface UpdateBlueprintRequest {
    description: string;
    attributes: Record<string, string>;
}

/**
 * @api {put} /patterns/:id Update pattern's metadata
 * @apiGroup Pattern
 * @apiVersion 1.0.0
 * @apiDescription Update pattern's metadata
 * @apiName Updates pattern's metadata
   * @apiParam (RequestBody) {String} description Pattern's Description
   * @apiParam (RequestBody) {Object} attributes JSON Object
   * @apiSuccessExample Success-Response:
   *      HTTP/1.1 200 OK
   * API Headers {"Access-Control-Allow-Origin":"*","X-Amzn-Trace-Id":"Root=1-6168f480-0bd8024e6ceb2ff2602efa94;Sampled=1","Content-Type":"application/json"}
   * {
        "patternObject": {
            "patternId": "sample-pattern1",
            "name": "sample-pattern1",
            "description": "test pattern",
            "patternType": "CFN",
            "updatedTimestamp": "2022-09-16T07:01:02.145Z",
            "createdTimestamp": "2022-09-16T07:01:02.145Z",
            "infrastructureStackStatus": "CREATE_IN_PROGRESS",
            "patternRepoURL": "git://dev.github-enterprise.abc/enterprise/sample-pattern1.git",
            "attributes": {
                "DataClassification": "PII",
                "SecurityLevel": "Medium"
            },
            "codeRepository": {
                "type": "github",
                "repoOwner": "enterprise",
                "branchName": "master",
                "repoName": "sample-pattern1"
            }
        }
     }      
   *
   */

@injectable()
export class UpdateBlueprintMetaInfoHandler
    implements AsyncRequestHandler<APIGatewayProxyEvent, ServerlessResponse>
{
    /**
     * Logger of update pattern meta info handler
     */
    private readonly logger: Logger;
    /**
     * Creates an instance of update blueprint handler.
     * @param loggerFactory
     */

    public constructor(
        @inject('LoggerFactory') loggerFactory: LoggerFactory,
        @inject('BlueprintDBService')
        private readonly blueprintDBService: BlueprintDBService
    ) {
        this.logger = loggerFactory.getLogger('UpdateBlueprintHandler');
    }

    /**
     * Handles update blueprint meta info handler
     * @param event
     * @param _context
     * @returns handle
     */
    public async handle(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): Promise<ServerlessResponse> {
        this.logger.debug('Processing update pattern request');
        if (!event.body) {
            return ServerlessResponse.ofObject(
                400,
                'Request body must contain valid JSON.'
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const input: UpdateBlueprintRequest = JSON.parse(event.body);

        if (!event.pathParameters?.id) {
            return ServerlessResponse.ofObject(400, {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Message: 'Kindly pass a valid pattern id.',
            });
        }

        await this.blueprintDBService.updateBlueprintMetaData(
            event.pathParameters.id,
            input.description,
            input.attributes
        );

        const patternObject = await this.blueprintDBService.getBlueprintById(
            event.pathParameters.id
        );

        return ServerlessResponse.ofObject(200, { patternObject });
    }
}
