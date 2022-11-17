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
import {
    BlueprintObject,
    environmentContantValues,
} from '../../../src/types/BlueprintType';
import { StackStatus } from '@aws-sdk/client-cloudformation';
import { CodeBuildClient } from '@aws-sdk/client-codebuild';
import { BlueprintPipelineBuilderService } from '../../../src/service/BlueprintPipelineBuilderService';

describe('test GetBlueprintInfoHandler', () => {
    awsmock.setSDKInstance(aws);

    beforeEach(() => {
        reset();
    });

    test('Mock update Blueprint metdadata Info', async () => {
        const blueprintDBService = mock(BlueprintDBService);
        const getBlueprintByIdHandle = jest.fn();
        blueprintDBService.getBlueprintById = getBlueprintByIdHandle;
        getBlueprintByIdHandle.mockReturnValue({
            blueprintId: 'ServerlessApp',
            blueprintversion: environmentContantValues.META_DATA,
            name: 'ServerlessApp',
            owner: 'awsapjsb',
            email: '123@amazon.com',
            description: 'ServerlessApp',
            blueprintType: 'CDK',
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

        const codeBuildClient = mock(CodeBuildClient);
        const codeBuildClientHandle = jest.fn();
        codeBuildClient.send = codeBuildClientHandle;
        codeBuildClientHandle.mockReturnValue({});

        const blueprintObject: BlueprintObject = {
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
        };

        const s3 = mock(aws.S3);
        const s3putObjectHandle = jest.fn().mockReturnValue(Promise.resolve(true));
        s3.putObject = s3putObjectHandle;
        const objectUnderTest = new BlueprintPipelineBuilderService(
            new StaticLoggerFactory(),
            codeBuildClient
        );
        expect(
            await objectUnderTest.invokeCodeBuildProject(blueprintObject)
        ).toBeDefined();
    });
});
