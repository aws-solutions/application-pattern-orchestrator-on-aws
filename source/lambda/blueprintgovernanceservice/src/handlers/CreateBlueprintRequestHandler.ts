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
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-throw-literal */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-var */
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { AsyncRequestHandler } from '../common/AsyncRequestHandler';
import { inject, injectable } from 'tsyringe';
import { ServerlessResponse } from '../common/ServerlessResponse';
import { Logger, LoggerFactory } from '../common/logging';
import {
    BlueprintCodeRepoDetails,
    BlueprintObject,
    PatternRepoType,
} from '../types/BlueprintType';
import { stringToSlug } from '../service/Id';
import { BlueprintDBService } from '../service/BlueprintDBService';
import { IBlueprintRepoBuilderService } from '../service/blueprint-repo-builder/IBlueprintRepoBuilderService';
import { BlueprintPipelineBuilderService } from '../service/BlueprintPipelineBuilderService';
import { StackStatus } from '@aws-sdk/client-cloudformation';
import { PatternType } from '../common/common-types';
import { makeAttributeId } from '../common/Attribute';
import { sendAnonymousMetric } from '../common/metrics/operational-metric';

/**
 * Create blueprint request interface
 */
export interface CreateBlueprintRequest {
    name: string;
    description: string;
    patternType: PatternType;
    email: string; //Email address of the Blueprint owner
    owner?: string; //Owner of the Blueprint
    attributes?: Record<string, string>;
}

/**
   * @api {post} /patterns Create pattern
   * @apiGroup Pattern
   * @apiVersion 1.0.0
   * @apiDescription Creates new pattern
   * @apiName Create Pattern
   *
   * @apiParam (RequestBody) {String} name Pattern's Name
   * @apiParam (RequestBody) {String} description Pattern's Description
   * @apiParam (RequestBody) {String} patternType Pattern Type i.e. CDK or CFN
   * @apiParam (RequestBody) {Object} attributes JSON Object


   * @apiSuccessExample Success-Response:
   *      HTTP/1.1 201 Created
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
                "branchName": "master",
                "repoName": "sample-pattern1"
            }
        }
     }                             
   *
   */
@injectable()
export class CreateBlueprintRequestHandler
    implements AsyncRequestHandler<APIGatewayProxyEvent, ServerlessResponse>
{
    /**
     * Logger of create blueprint request handler
     */
    private readonly logger: Logger;

    /**
     * Creates an instance of create blueprint request handler.
     * @param loggerFactory
     * @param blueprintDBService
     * @param blueprintRepoBuilderService
     * @param blueprintPipelineBuilderService
     */
    public constructor(
        @inject('LoggerFactory') loggerFactory: LoggerFactory,
        @inject('BlueprintDBService')
        private readonly blueprintDBService: BlueprintDBService,
        @inject('BlueprintRepoBuilderService')
        private readonly blueprintRepoBuilderService: IBlueprintRepoBuilderService,
        @inject('BlueprintPipelineBuilderService')
        private readonly blueprintPipelineBuilderService: BlueprintPipelineBuilderService
    ) {
        this.logger = loggerFactory.getLogger('CreateBlueprintRequestHandler');
    }

    private async validateInputData(
        input: CreateBlueprintRequest
    ): Promise<ServerlessResponse | undefined> {
        if (input.name.length > 40 || input.name.match(/[^a-z0-9-_]/g)) {
            return ServerlessResponse.ofObject(400, {
                'Error Message':
                    'Invalid pattern name. Only these characters [a-z0-9-_] are allowed.',
            });
        }

        if (await this.isBlueprintExists(stringToSlug(input.name))) {
            return ServerlessResponse.ofObject(409, {
                'Error Message': `${input.name} pattern already exists`,
            });
        }

        // validate attributes exists
        if (input.attributes) {
            return this.validateAttributes(input.attributes);
        }
    }

    private async sendOperationalMetric(): Promise<void> {
        if (
            process.env.ANONYMOUS_DATA_UUID &&
            process.env.SOLUTION_ID &&
            process.env.SOLUTION_VERSION
        ) {
            const operationalMetric = {
                awsSolutionId: process.env.SOLUTION_ID,
                awsSolutionVersion: process.env.SOLUTION_VERSION,
                anonymousDataUUID: process.env.ANONYMOUS_DATA_UUID,
                data: {
                    patternCreated: 1,
                },
            };
            sendAnonymousMetric(operationalMetric);
        }
    }

    /**
     * Handles create pattern request handler
     * @param event - lambda event
     * @param _context - lambda context
     * @returns handle
     */
    public async handle(
        event: APIGatewayProxyEvent,
        _context: Context
    ): Promise<ServerlessResponse> {
        this.logger.debug(`Processing create pattern request ${JSON.stringify(event)}`);

        if (!event.body) {
            return ServerlessResponse.ofObject(409, {
                'Error Message': 'Invalid event. There is no body inside the event.',
            });
        }
        const input: CreateBlueprintRequest = JSON.parse(event.body);

        const validationResponse = await this.validateInputData(input);
        if (validationResponse) {
            return validationResponse;
        }

        // prepare data to be written to database
        const creationTime = new Date();
        const blueprintName = stringToSlug(input.name);
        let blueprintCodeRepoDetails: BlueprintCodeRepoDetails;
        try {
            this.logger.debug(`Creating repo: ${blueprintName}`);
            blueprintCodeRepoDetails =
                await this.blueprintRepoBuilderService.createAndInitializeRepo(
                    blueprintName,
                    input.patternType
                );
        } catch (e) {
            this.logger.error(
                `Error in creating/initialising pattern repo ${blueprintName}, failed with error: ${JSON.stringify(
                    e
                )}`
            );

            return ServerlessResponse.ofObject(500, {
                Message: `Error in creating/initialising pattern repo ${blueprintName}, kindly contact Administrator`,
            });
        }

        const blueprintObject: BlueprintObject = {
            patternId: blueprintName,
            name: input.name,
            owner: input.owner,
            email: input.email,
            description: input.description,
            patternType: input.patternType,
            updatedTimestamp: creationTime.toISOString(),
            createdTimestamp: creationTime.toISOString(),
            infrastructureStackStatus: StackStatus.CREATE_IN_PROGRESS,
            patternRepoURL: blueprintCodeRepoDetails.patternRepoURL,
            attributes: input.attributes,
            codeRepository: {
                branchName: blueprintCodeRepoDetails.branchName,
                repoName: blueprintCodeRepoDetails.repoName,
            },
        };
        const patternRepoType: PatternRepoType = (process.env.PATTERN_REPO_TYPE ??
            'CodeCommit') as PatternRepoType;
        if (patternRepoType === 'GitHub') {
            blueprintObject.codeRepository.repoOwner = blueprintCodeRepoDetails.repoOwner;
        }

        try {
            this.logger.debug(
                'blueprintPipelineBuilderService invokeCodeBuildProject initialization'
            );
            await this.blueprintPipelineBuilderService.invokeCodeBuildProject(
                blueprintObject
            );
            this.logger.debug(
                'blueprintPipelineBuilderService invokeCodeBuildProject successful'
            );
        } catch (e) {
            blueprintObject.infrastructureStackStatus = StackStatus.CREATE_FAILED;

            this.logger.error(
                `blueprintPipelineBuilderService invokeCodeBuildProject failed ${JSON.stringify(
                    e
                )}`
            );

            await this.blueprintDBService.createBlueprint(blueprintObject);

            return ServerlessResponse.ofObject(500, {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Message:
                    'Blueprint Pipeline creation failed kindly contact Administrator to initialise the pipeline',
            });
        }
        await this.blueprintDBService.createBlueprint(blueprintObject);
        this.sendOperationalMetric();
        return ServerlessResponse.ofObject(201, { patternObject: blueprintObject });
    }

    /**
     * Determines whether blueprint exists is
     * @param blueprintId
     * @returns
     */
    private async isBlueprintExists(blueprintId: string): Promise<boolean> {
        const response = await this.blueprintDBService.getBlueprintById(blueprintId);
        if (response) return true;
        return false;
    }

    private async validateAttributes(
        attributes: Record<string, string>
    ): Promise<ServerlessResponse | undefined> {
        const invalidAttributeName: string[] = [];

        // verify attributes exist
        // must use for-loop for async/await
        const keys = Object.keys(attributes);
        for (const key of keys) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            const value = attributes[key] ?? '';
            const attributeId = makeAttributeId(key, value);

            // verify attributes exist
            const checkItem = await this.blueprintDBService.getAttributeById(attributeId);
            if (!checkItem || !('id' in checkItem)) {
                invalidAttributeName.push(`${key}:${value}`);
            }
        }

        if (invalidAttributeName.length > 0) {
            return ServerlessResponse.ofObject(400, {
                'Error Message': `Some attributes specified are not valid. Invalid Attributes: ${invalidAttributeName.join(
                    ','
                )}`,
            });
        }
    }
}
