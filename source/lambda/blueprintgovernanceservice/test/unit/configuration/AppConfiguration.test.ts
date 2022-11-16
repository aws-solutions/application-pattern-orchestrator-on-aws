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
import { AppConfiguration } from '../../../src/common/configuration/AppConfiguration';

describe('Test AppConfiguration.test', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV };
    });
    afterEach(() => {
        process.env = ORIGINAL_ENV;
    });

    test('should retrieve depdencies configuration', () => {
        process.env.LOG_LEVEL = 'debug';
        process.env.githubTokenSecretId = 'githubTokenSecretId';
        const objectUnderTest = new AppConfiguration('test-app');
        expect(
            objectUnderTest.getDepdencyFor('BLUEPRINTGOVERNANCE')?.githubTokenSecretId
        ).toEqual('githubTokenSecretId');
    });

    test('no default key when configuration missing', () => {
        const objectUnderTest = new AppConfiguration('test-app');
        expect(objectUnderTest.getDepdencyFor('BLUEPRINTGOVERNANCE')?.name).toEqual(
            'BLUEPRINTGOVERNANCE'
        );
    });

    test('no default key when configuration missing endpoint key', () => {
        process.env.ATTESTATION_ENDPOINT_KEY = undefined;
        const objectUnderTest = new AppConfiguration('test-app');
        expect(
            objectUnderTest.getDepdencyFor('BLUEPRINTGOVERNANCE')?.githubTokenSecretId
        ).toBeUndefined();
    });
});
