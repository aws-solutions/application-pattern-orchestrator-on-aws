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
import { LoggerFactory } from '../common/logging';
import { Logger } from 'aws-xray-sdk';
import {
    CodeBuildClient,
    StartBuildCommand,
    StartBuildCommandInput,
} from '@aws-sdk/client-codebuild';
import { environmentVariables } from '../common/configuration/AppConfiguration';
import { BlueprintObject } from '../types/BlueprintType';

@injectable()
export class BlueprintPipelineBuilderService {
    /**
     * Logger  of blueprint pipeline builder service
     */
    private readonly logger: Logger;

    /**
     * Creates an instance of blueprint pipeline builder service.
     * @param loggerFactory
     * @param codeBuildClient
     */
    public constructor(
        @inject('LoggerFactory') loggerFactory: LoggerFactory,
        @inject('CodeBuildClient') private readonly codeBuildClient: CodeBuildClient
    ) {
        this.logger = loggerFactory.getLogger('BlueprintPipelineBuilderService');
    }

    /**
     * Invokes code build project
     * @param blueprintObject
     * @returns code build project
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async invokeCodeBuildProject(blueprintObject: BlueprintObject): Promise<any> {
        try {
            const environmentVariable = [
                { name: 'BLUEPRINT_ID', value: blueprintObject.patternId },
                { name: 'BLUEPRINT_TYPE', value: blueprintObject.patternType },
                {
                    name: 'GITHUB_REPOSITORY_OWNER',
                    value: blueprintObject.codeRepository.repoOwner,
                },
                {
                    name: 'GITHUB_REPOSITORY_NAME',
                    value: blueprintObject.codeRepository.repoName,
                },
                {
                    name: 'GITHUB_REPOSITORY_MAIN_BRANCH_NAME',
                    value: blueprintObject.codeRepository.branchName || 'main',
                },
            ];
            const startBuildCommandInput: StartBuildCommandInput = {
                projectName:
                    process.env[
                        environmentVariables.BLUEPRINT_CODE_BUILD_JOB_PROJECT_NAME
                    ],
                environmentVariablesOverride: environmentVariable,
            };
            const startCommand = new StartBuildCommand(startBuildCommandInput);

            return await this.codeBuildClient.send(startCommand);
        } catch (e) {
            throw new Error(`Error to invokeCodeBuildProject: ${JSON.stringify(e)}`);
        }
    }
}
