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
/* eslint-disable no-var */

import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { AsyncRequestHandler } from '../common/AsyncRequestHandler';
import { inject, injectable } from 'tsyringe';
import { ServerlessResponse } from '../common/ServerlessResponse';
import { Logger, LoggerFactory } from '../common/logging';
import { BlueprintDBService } from '../service/BlueprintDBService';
import { BlueprintObject } from '../types/BlueprintType';
import { BlueprintPipelineBuilderService } from '../service/BlueprintPipelineBuilderService';
import { StackStatus } from '@aws-sdk/client-cloudformation';

/**
   * @api {PUT} /patterns/pipeline/{id} Triggers codepipeline to build failed patterns
   * @apiGroup Pattern
   * @apiVersion 1.0.0
   * @apiDescription Triggers codepipeline to build failed patterns
   * @apiName Triggers codepipeline to build failed patterns
   *    
   * @apiParam (RequestBody) {String} id Pattern's name
   * 
   * @apiSuccessExample Success-Response:
   *      HTTP/1.1 201 Created
   * API Headers {"Access-Control-Allow-Origin":"*","X-Amzn-Trace-Id":"Root=1-6168f480-0bd8024e6ceb2ff2602efa94;Sampled=1","Content-Type":"application/json"}
   * {
        "codeRepository": {
            "branchName": "master",
            "type": "github",
            "repoOwner": "enterprise",
            "repoName": "sample-pattern"
        },
        "updatedTimestamp": "2022-09-16T06:25:59.256Z",
        "attributes": {
            "DataClassification": "PII"
        },
        "patternType": "CFN",
        "description": "",
        "createdTimestamp": "2022-09-16T06:25:59.256Z",
        "name": "sample-pattern",
        "patternRepoURL": "git://dev.github-enterprise.abc/enterprise/sample-pattern.git",
        "infrastructureStackStatus": "CREATE_IN_PROGRESS",
        "patternId": "sample-pattern"
     }                           
   *
   */
@injectable()
export class InitialiseBlueprintPipelineHandler
    implements AsyncRequestHandler<APIGatewayProxyEvent, ServerlessResponse>
{
    /**
     * Logger  of get blueprint by version handler
     */
    private readonly logger: Logger;
    /**
     * Creates an instance of get blueprint by version handler.
     * @param loggerFactory
     * @param blueprintDBService
     */
    public constructor(
        @inject('LoggerFactory') loggerFactory: LoggerFactory,
        @inject('BlueprintDBService')
        private readonly blueprintDBService: BlueprintDBService,
        @inject('BlueprintPipelineBuilderService')
        private readonly blueprintPipelineBuilderService: BlueprintPipelineBuilderService
    ) {
        this.logger = loggerFactory.getLogger('InitialiseBlueprintPipelineHandler');
    }

    /**
     * Handles get blueprint by version handler
     * @param event
     * @param _context
     * @returns handle
     */
    public async handle(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): Promise<ServerlessResponse> {
        this.logger.debug("Initialise Pattern's Pipeline request");

        if (!event.pathParameters?.id) {
            return ServerlessResponse.ofObject(400, {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Message: 'Kindly pass valid pattern ID.',
            });
        } else {
            const pattern: BlueprintObject =
                await this.blueprintDBService.getBlueprintById(event.pathParameters.id);
            this.logger.debug(JSON.stringify(pattern));

            try {
                await this.blueprintPipelineBuilderService.invokeCodeBuildProject(
                    pattern
                );
            } catch (e) {
                pattern.infrastructureStackStatus = StackStatus.CREATE_FAILED;

                await this.blueprintDBService.updateStatusBlueprintById(
                    pattern.patternId,
                    pattern.infrastructureStackStatus
                );

                return ServerlessResponse.ofObject(500, {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    Message:
                        'Pattern Pipeline creation failed kindly contact Administrator to initialise the pipeline',
                });
            }

            pattern.infrastructureStackStatus = StackStatus.CREATE_IN_PROGRESS;

            await this.blueprintDBService.updateStatusBlueprintById(
                pattern.patternId,
                pattern.infrastructureStackStatus
            );
            return ServerlessResponse.ofObject(201, pattern);
        }
    }
}
