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
import { BlueprintObjectWithPublishData } from '../types/BlueprintType';
/* 
  As getting a large number of blueprints from DDB takes long time and may timeout the Lambda
  function, set the maximum number of blueprints can be retrieved in one request to protect the API.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const MAX_NUM_RESULTS = 200;

/**
   * @api {get} /patterns List patterns
   * @apiGroup Pattern
   * @apiVersion 1.0.0
   * @apiDescription List all patterns
   * 
   * @apiSuccessExample Success-Response:
   *      HTTP/1.1 200 OK
   {
  "results": [
    {
      "patternMetaData": {
        "codeRepository": {
          "branchName": "master",
          "type": "github",
          "repoOwner": "enterprise",
          "repoName": "sample-pattern"
        },
        "updatedTimestamp": "2022-09-16T06:34:33.648Z",
        "lastCommitId": "5291a66986299b60536e1d944a82f6edaa88287e",
        "attributes": {
          "DataClassification": "PII",
          "SecurityLevel": "Medium"
        },
        "patternType": "CFN",
        "description": "decription",
        "name": "sample-pattern",
        "createdTimestamp": "2022-09-16T04:17:10.656Z",
        "patternRepoURL": "git://dev.github-enterprise.abc/enterprise/sample-pattern.git",
        "infrastructureStackStatus": "CREATE_COMPLETE",
        "patternId": "sample-pattern"
      },
      "lastCommitPublishData": {
        "allPackages": [
          {
            "name": "@my-cfn/dynamodb",
            "version": "1.0.2"
          }
        ],
        "updatedTimestamp": "2022-10-25T02:53:14.535Z",
        "changedPackages": [
          {
            "name": "@my-cfn/dynamodb",
            "version": "1.0.2"
          }
        ],
        "artifacts": [
          {
            "type": "CONTROL",
            "name": "cfn_nag.txt",
            "location": "sample-pattern/29c26261aa732dd9851258c89a6c375af7cf3d0d/controls/cfn_nag.txt"
          },
          {
            "type": "IMAGE",
            "name": "architecture.png",
            "location": "sample-pattern/29c26261aa732dd9851258c89a6c375af7cf3d0d/images/architecture.png"
          },
          {
            "type": "MARKDOWN",
            "name": "README.md",
            "location": "sample-pattern/29c26261aa732dd9851258c89a6c375af7cf3d0d/markdown/README.md"
          },
          {
            "type": "MARKDOWN",
            "name": "USAGE.md",
            "location": "sample-pattern/29c26261aa732dd9851258c89a6c375af7cf3d0d/markdown/USAGE.md"
          }
        ],
        "serviceCatalogProducts": [
          {
            "name": "sample-pattern_@my-cfn/dynamodb",
            "region": "ap-southeast-2",
            "productId": "prod-42323232dsd",
            "account": "xxxxxxxxxxxx",
            "provisioningArtifactId": "pa-1111aaaassss"
          }
        ],
        "commitMessage": "Merge pull request #1 from test/feature new templates added",
        "createdTimestamp": "2022-10-25T02:53:14.535Z",
        "commitId": "29c26261aa732dd9851258c89a6c375af7cf3d0d",
        "patternId": "sample-pattern"
      }
    }
  ]
}
   * @apiSampleRequest off
   */
@injectable()
export class GetAllBlueprintsRequestHandler
    implements AsyncRequestHandler<APIGatewayProxyEvent, ServerlessResponse>
{
    /**
     * Logger  of get all blueprints request handler
     */
    private readonly logger: Logger;
    /**
     * Creates an instance of get all blueprints request handler.
     * @param loggerFactory
     * @param blueprintDBService
     */
    public constructor(
        @inject('LoggerFactory') loggerFactory: LoggerFactory,
        @inject('BlueprintDBService')
        private readonly blueprintDBService: BlueprintDBService
    ) {
        this.logger = loggerFactory.getLogger('GetBlueprintsRequestHandler');
    }

    /**
     * Handles get all blueprints request handler
     * @param event
     * @param _context
     * @returns handle
     */
    public async handle(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
        _context: Context
    ): Promise<ServerlessResponse> {
        this.logger.debug('Processing list pattern request');

        let limit = parseInt(event.queryStringParameters?.limit as string);
        if (!limit || limit <= 0 || limit > MAX_NUM_RESULTS) {
            limit = MAX_NUM_RESULTS;
        }
        this.logger.debug(`Listing patterns, up to ${limit} patterns will be returned.`);
        const patterns = await this.blueprintDBService.listBlueprints(
            limit,
            event.queryStringParameters?.nextToken
        );
        this.logger.debug(`Found ${patterns.results.length} patterns.`);

        const patternsList: BlueprintObjectWithPublishData[] = [];

        for (const patternMetaData of patterns.results) {
            let lastCommitPublishData;
            if (patternMetaData.lastCommitId) {
                lastCommitPublishData =
                    await this.blueprintDBService.getBlueprintPublishDataByCommitId(
                        patternMetaData.patternId,
                        patternMetaData.lastCommitId
                    );
            }
            patternsList.push({
                patternMetaData,
                lastCommitPublishData,
            });
        }

        return ServerlessResponse.ofObject(200, {
            results: patternsList,
        });
    }
}
