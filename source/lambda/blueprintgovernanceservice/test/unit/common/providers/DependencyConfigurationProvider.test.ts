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
import 'reflect-metadata';
import { instance, mock, when } from 'ts-mockito';
import { AppConfiguration } from '../../../../src/common/configuration/AppConfiguration';
import { DependencyConfigurationProvider } from '../../../../src/common/providers/DependencyConfigurationProvider';
import AWS from 'aws-sdk';

const secretsManagergetSecretValue = {
    getSecretValue: jest.fn().mockReturnThis(),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    promise: jest.fn().mockReturnValue({ SecretString: 'testSecret' }),
};
jest.mock('aws-sdk', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    return { SecretsManager: jest.fn(() => secretsManagergetSecretValue) };
});

describe('DependencyConfigurationProvider - getSecret and getSSM mock', () => {
    test('should successfully mock getAGSAttestationAuthorityId function ', async () => {
        // const mockGetParameter = jest.fn();

        const testingAppConfiguration = mock(AppConfiguration);

        const dependencyConfigurationProvider: DependencyConfigurationProvider =
            new DependencyConfigurationProvider(
                instance(testingAppConfiguration),
                new AWS.SecretsManager()
            );
        when(testingAppConfiguration.getDepdencyFor('BLUEPRINTGOVERNANCE')).thenReturn({
            name: 'BLUEPRINTGOVERNANCE',
            githubTokenSecretId: 'githubTokenSecretId',
        });
        const value =
            await dependencyConfigurationProvider.getBlueprintServiceRepoCredentials(
                'BLUEPRINTGOVERNANCE'
            );

        expect(value).toEqual('testSecret');
    });
});
