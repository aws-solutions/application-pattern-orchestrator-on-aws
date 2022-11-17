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
import { SecretsManager } from 'aws-sdk';
import { inject, singleton } from 'tsyringe';
import BlueprintError from '../BlueprintError';
import {
    AppConfiguration,
    Dependency,
    DependencyServiceName,
} from '../configuration/AppConfiguration';

@singleton()
export class DependencyConfigurationProvider {
    public constructor(
        @inject('AppConfiguration') private readonly applicationConfig: AppConfiguration,
        @inject('SecretsManager')
        private readonly secretsManager: SecretsManager
    ) {}

    public getMandatoryDependency(
        depedencyServiceName: DependencyServiceName
    ): Dependency {
        const dependency = this.applicationConfig.getDepdencyFor(depedencyServiceName);
        if (!dependency || !dependency.githubTokenSecretId) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BlueprintError(
                `Invalid configuration - No ${depedencyServiceName} dependency configured - githubTokenSecretId needs to be configured`,
                503
            );
        }
        return dependency;
    }

    public async getBlueprintServiceRepoCredentials(
        depedencyServiceName: DependencyServiceName
    ): Promise<string> {
        try {
            const dependency = this.getMandatoryDependency(depedencyServiceName);
            return await this.getSecretsValue(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                dependency.githubTokenSecretId!
            );
        } catch (e) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw new BlueprintError(
                `Invalid configuration - Error while retrieve getBlueprintServiceRepoCredentials on ${depedencyServiceName} dependency configured from secrets manager`,
                503
            );
        }
    }

    public async getSecretsValue(secretName: string): Promise<string> {
        const params: SecretsManager.Types.GetSecretValueRequest = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            SecretId: secretName,
        };
        const responseFromSecretMgr = await this.secretsManager
            .getSecretValue(params)
            .promise();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return responseFromSecretMgr.SecretString!;
    }
}
