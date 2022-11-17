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
import { mock, reset } from 'ts-mockito';
import * as aws from 'aws-sdk';
import * as awsmock from 'aws-sdk-mock';
import { BlueprintDBService } from '../../../src/service/BlueprintDBService';
import { StaticLoggerFactory } from '../../../src/common/logging/index';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { GetAllBlueprintsRequestHandler } from '../../../src/handlers/GetAllBlueprintsRequestHandler';

describe('test GetAllBlueprintsRequestHandler', () => {
    awsmock.setSDKInstance(aws);

    const dbListPatternsMetaDataResponse = {
        results: [
            {
                codeRepository: {
                    branchName: 'master',
                    type: 'github',
                    repoOwner: 'test-enterprise',
                    repoName: 'ver-test-3-cdk',
                },
                updatedTimestamp: '2022-07-14T02:34:54.880Z',
                patternType: 'CDK',
                patternId: 'ver-test-3-cdk',
                lastCommitId: 'aa4633098e95ba8958b7cba0dbcc499001c832f5',
                attributes: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    DataClassification: 'Group',
                },
                description: 'test cdk description 3',
                name: 'ver-test-3-cdk',
                patternRepoURL:
                    'git://github.test.org/test-enterprise/ver-test-3-cdk.git',
                createdTimestamp: '2022-07-13T14:48:28.239Z',
                infrastructureStackStatus: 'UPDATE_COMPLETE',
            },
        ],
        nextToken: undefined,
    };
    const dbGetPatternPublishDataByLastCommitIdResponse = {
        allPackages: [
            {
                name: '@demo-cdk/compliant-dynamodbtable',
                version: '1.0.1',
            },
            {
                name: '@demo-cdk/compliant-s3-bucket',
                version: '1.0.1',
            },
        ],
        updatedTimestamp: '2022-10-26T04:34:36.548Z',
        changedPackages: [
            {
                name: '@demo-cdk/compliant-dynamodbtable',
                version: '1.0.1',
            },
            {
                name: '@demo-cdk/compliant-s3-bucket',
                version: '1.0.1',
            },
        ],
        codeArtifactDetails: {
            codeArtifactRepositoryName: 'awspatterns',
            region: 'ap-southeast-2',
            codeArtifactDomainName: 'awspatterns',
            account: 'zzzzxxxxxxxx',
        },
        artifacts: [
            {
                type: 'CONTROL',
                name: 'cfn_nag.txt',
                location:
                    'ver-test-3-cdk/edc31bd3cc7b085d67cd2ea9f0126d58db8d62ae/controls/cfn_nag.txt',
            },
            {
                type: 'MARKDOWN',
                name: 'README.md',
                location:
                    'ver-test-3-cdk/edc31bd3cc7b085d67cd2ea9f0126d58db8d62ae/markdown/README.md',
            },
        ],
        commitMessage:
            'Merge pull request #1 from apjsb-enterprise/feature  new templates added',
        createdTimestamp: '2022-10-26T04:34:36.548Z',
        commitId: 'edc31bd3cc7b085d67cd2ea9f0126d58db8d62ae',
        patternId: 'ver-test-3-cdk',
    };

    beforeEach(() => {
        reset();
    });

    test('Mock GetAll blueprints', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const listBlueprintsHandle = jest.fn();
        blueprintDBService.listBlueprints = listBlueprintsHandle;
        listBlueprintsHandle.mockReturnValue({
            results: [],
            nextToken: undefined,
        });

        const objectUnderTest = new GetAllBlueprintsRequestHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        expect(
            await objectUnderTest.handle(
                {
                    body: JSON.stringify('inputRequest'),
                    //   pathParameters: { id: '123' },
                    headers: { ttl: new Date().getTime().toString() },
                } as unknown as APIGatewayProxyEvent,
                {} as Context
            )
        ).toBeDefined();
    });

    test('Mock GetAll blueprints with empty result ', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const listBlueprintsHandle = jest.fn();
        blueprintDBService.listBlueprints = listBlueprintsHandle;
        listBlueprintsHandle.mockReturnValue({
            results: [],
            nextToken: undefined,
        });

        const objectUnderTest = new GetAllBlueprintsRequestHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        const results = await objectUnderTest.handle(
            {
                body: JSON.stringify('inputRequest'),
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );

        const statusCode = results.statusCode;
        expect(statusCode).toEqual(200);
    });

    test('Mock GetAll blueprints with result ', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const listBlueprintsHandle = jest.fn();
        blueprintDBService.listBlueprints = listBlueprintsHandle;
        listBlueprintsHandle.mockReturnValue(dbListPatternsMetaDataResponse);

        const getPatternPublishDataHandle = jest.fn();
        blueprintDBService.getBlueprintPublishDataByCommitId =
            getPatternPublishDataHandle;
        getPatternPublishDataHandle.mockReturnValue(
            dbGetPatternPublishDataByLastCommitIdResponse
        );

        const objectUnderTest = new GetAllBlueprintsRequestHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        const response = await objectUnderTest.handle(
            {
                body: JSON.stringify('inputRequest'),
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );

        const statusCode = response.statusCode;

        expect(statusCode).toEqual(200);
        expect(response.body).toEqual(
            JSON.stringify({
                results: [
                    {
                        patternMetaData: dbListPatternsMetaDataResponse.results[0],
                        lastCommitPublishData:
                            dbGetPatternPublishDataByLastCommitIdResponse,
                    },
                ],
            })
        );
    });

    test('Mock GetAll blueprints with result and limit ', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const listBlueprintsHandle = jest.fn();
        blueprintDBService.listBlueprints = listBlueprintsHandle;
        listBlueprintsHandle.mockReturnValue(dbListPatternsMetaDataResponse);

        const getPatternPublishDataHandle = jest.fn();
        blueprintDBService.getBlueprintPublishDataByCommitId =
            getPatternPublishDataHandle;
        getPatternPublishDataHandle.mockReturnValue(
            dbGetPatternPublishDataByLastCommitIdResponse
        );

        const objectUnderTest = new GetAllBlueprintsRequestHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        const response = await objectUnderTest.handle(
            {
                body: JSON.stringify('inputRequest'),
                pathParameters: { limit: '2' },
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );

        const statusCode = response.statusCode;

        expect(statusCode).toEqual(200);
        expect(response.body).toEqual(
            JSON.stringify({
                results: [
                    {
                        patternMetaData: dbListPatternsMetaDataResponse.results[0],
                        lastCommitPublishData:
                            dbGetPatternPublishDataByLastCommitIdResponse,
                    },
                ],
            })
        );
    });
});
