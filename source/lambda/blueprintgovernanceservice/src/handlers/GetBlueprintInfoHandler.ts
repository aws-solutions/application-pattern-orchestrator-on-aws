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

/**
   * @api {get} /patterns/{id} Get pattern details
   * @apiGroup Pattern
   * @apiVersion 1.0.0
   * @apiDescription Get pattern details
   * 
   * @apiSuccessExample Success-Response:
   *      HTTP/1.1 200 OK
   *      {
            "metadata": {
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
                "description": "test decription",
                "name": "sample-pattern",
                "createdTimestamp": "2022-09-16T04:17:10.656Z",
                "patternRepoURL": "git://dev.github-enterprise.abc/enterprise/sample-pattern.git",
                "infrastructureStackStatus": "CREATE_COMPLETE",
                "patternId": "sample-pattern"
            },
            "lastCommitPublishData": {
                "allPackages": [
                    {
                        "name": "@sample-pattern/dynamodb-pattern",
                        "version": "1.0.2"
                    }
                ],
                "updatedTimestamp": "2022-09-16T06:34:33.648Z",
                "changedPackages": [
                    {
                        "name": "@sample-pattern/dynamodb-pattern",
                        "version": "1.0.2"
                    }
                ],
                "artifacts": [
                    {
                        "type": "CONTROL",
                        "name": "cfn_nag.txt",
                        "location": "sample-pattern/5291a66986299b60536e1d944a82f6edaa88287e/controls/cfn_nag.txt"
                    },
                    {
                        "type": "MARKDOWN",
                        "name": "README.md",
                        "location": "sample-pattern/5291a66986299b60536e1d944a82f6edaa88287e/markdown/README.md"
                    }
                ],
                "serviceCatalogProducts": [
                    {
                        "name": "sample-pattern_@sample-pattern/dynamodb-pattern",
                        "region": "ap-southeast-2",
                        "productId": "prod-otgvptp6uh6nc",
                        "account": "111111111111",
                        "provisioningArtifactId": "pa-y6vhyv6t6j4aa"
                    }
                ],
                "commitMessage": "Merge pull request #2 from enterprise/feature  initial commit",
                "createdTimestamp": "2022-09-16T06:34:33.648Z",
                "commitId": "5291a66986299b60536e1d944a82f6edaa88287e",
                "patternId": "sample-pattern"
            }
          }
   * @apiSampleRequest off
*/
@injectable()
export class GetBlueprintInfoHandler
    implements AsyncRequestHandler<APIGatewayProxyEvent, ServerlessResponse>
{
    /**
     * Logger  of get blueprint versions handler
     */
    private readonly logger: Logger;
    /**
     * Creates an instance of get blueprint versions handler.
     * @param loggerFactory
     * @param blueprintDBService
     */
    public constructor(
        @inject('LoggerFactory') loggerFactory: LoggerFactory,
        @inject('BlueprintDBService')
        private readonly blueprintDBService: BlueprintDBService
    ) {
        this.logger = loggerFactory.getLogger('GetBlueprintRequestHandler');
    }

    /**
     * Handles get blueprint versions handler
     * @param event
     * @param _context
     * @returns handle
     */
    public async handle(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): Promise<ServerlessResponse> {
        this.logger.debug('Processing get pattern details request');

        if (!event.pathParameters?.id) {
            return ServerlessResponse.ofObject(400, {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Message: 'Kindly pass valid pattern id.',
            });
        }
        const patternMetaData = await this.blueprintDBService.getBlueprintById(
            event.pathParameters.id
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseObject: any = {
            metadata: patternMetaData,
        };

        let blueprintLastCommitPublishData;
        if (patternMetaData.lastCommitId) {
            blueprintLastCommitPublishData =
                await this.blueprintDBService.getBlueprintPublishDataByCommitId(
                    event.pathParameters.id,
                    patternMetaData.lastCommitId
                );
            responseObject['lastCommitPublishData'] = blueprintLastCommitPublishData;
        }
        return ServerlessResponse.ofObject(201, responseObject);
    }
}
