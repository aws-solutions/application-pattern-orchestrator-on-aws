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
import { GetBlueprintInfoHandler } from '../../../src/handlers/GetBlueprintInfoHandler';
import { StackStatus } from '@aws-sdk/client-cloudformation';

describe('test GetBlueprintInfoHandler', () => {
    awsmock.setSDKInstance(aws);

    beforeEach(() => {
        reset();
    });

    test('Mock Get Blueprint Info', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const getBlueprintsByIdHandle = jest.fn();
        blueprintDBService.getBlueprintById = getBlueprintsByIdHandle;
        getBlueprintsByIdHandle.mockReturnValue({
            codeRepository: {
                branchName: 'master',
                type: 'github',
                repoOwner: 'apjsb-enterprise',
                repoName: 'abc-cdk',
            },
            updatedTimestamp: '2022-03-28T17:01:53.769Z',
            patternType: 'CDK',
            patternId: 'abc-cdk',
            lastCommitId: '46d2657fa95e193d78e3211666250a14a2f29c90',
            description: 'CDK constructs library',
            patternRepoURL:
                'git://dev.github-enterprise.apjsb.aws.dev/apjsb-enterprise/abc-cdk.git',
            createdTimestamp: '2022-03-28T16:32:26.539Z',
            name: 'abc-cdk',
            infrastructureStackStatus: 'CREATE_COMPLETE',
        });
        const getBlueprintPublishDataByCommitIdHandle = jest.fn();
        blueprintDBService.getBlueprintPublishDataByCommitId =
            getBlueprintPublishDataByCommitIdHandle;
        getBlueprintPublishDataByCommitIdHandle.mockReturnValue({
            allPackages: [
                {
                    name: '@v2-cfn-test1/one',
                    version: '1.14.0',
                },
                {
                    name: '@v2-cfn-test1/two',
                    version: '1.3.0',
                },
            ],
            updatedTimestamp: '2022-03-27T11:02:54.018Z',
            changedPackages: [
                {
                    name: '@v2-cfn-test1/one',
                    version: '1.14.0',
                },
            ],
            artifacts: [
                {
                    type: 'CONTROL',
                    name: 'cfn_nag.txt',
                    location:
                        'v2-cfn-test1/46d2657fa95e193d78e3211666250a14a2f29c90/controls/cfn_nag.txt',
                },
                {
                    type: 'MARKDOWN',
                    name: 'README.md',
                    location:
                        'v2-cfn-test1/46d2657fa95e193d78e3211666250a14a2f29c90/markdown/README.md',
                },
            ],
            patternId: 'v2-cfn-test1',
            serviceCatalogProducts: [
                {
                    name: 'v2-cfn-test1_@v2-cfn-test1/one',
                    region: 'ap-southeast-2',
                    productId: 'prod-ggbflghslvmna',
                    account: '456115027943',
                    provisioningArtifactId: 'pa-heeav44qmhhnq',
                },
            ],
            createdTimestamp: '2022-03-27T11:02:54.018Z',
            commitId: '46d2657fa95e193d78e3211666250a14a2f29c90',
        });

        const objectUnderTest = new GetBlueprintInfoHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        const output = await objectUnderTest.handle(
            {
                body: JSON.stringify('inputRequest'),
                pathParameters: { id: '123' },
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );
        expect(output).toBeDefined();
        expect(output).not.toBeUndefined();
        expect(output.statusCode).toBe(201);
    });

    test('Mock Get Blueprint Info error flow when parameter is not available', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const getBlueprintsByIdHandle = jest.fn();
        blueprintDBService.getBlueprintById = getBlueprintsByIdHandle;
        getBlueprintsByIdHandle.mockReturnValue({
            patternId: 'ServerlessApp',
            name: 'ServerlessApp',
            owner: 'awsapjsb',
            email: '123@amazon.com',
            description: 'ServerlessApp',
            patternType: 'CDK',
            infrastructureStackStatus: StackStatus.CREATE_IN_PROGRESS,
            patternRepoURL: 'ssh://ServerlessApp',
            codeRepository: {
                type: 'CDK',
                repoOwner: 'awsapjsb',
                branchName: 'main',
                repoName: 'ServerlessApp',
            },
            deploymentPipelineArn: 'arn:pipleine',
            updatedTimestamp: '10-July-2021',
            createdTimestamp: '10-July-2021',
        });

        const objectUnderTest = new GetBlueprintInfoHandler(
            new StaticLoggerFactory(),
            blueprintDBService
        );
        const output = await objectUnderTest.handle(
            {
                body: JSON.stringify('inputRequest'),
                headers: { ttl: new Date().getTime().toString() },
            } as unknown as APIGatewayProxyEvent,
            {} as Context
        );

        expect(output).toBeDefined();
        // assert
        expect(output).not.toBeUndefined();
        expect(output.statusCode).toBe(400);
    });
});
