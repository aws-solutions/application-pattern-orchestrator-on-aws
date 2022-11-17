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

import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';

const env = {
    region: 'ap-southeast-2',
    userPoolId: 'ap-southeast-2_test',
    appClientId: '48ebobfn46cmhieimtestgi226',
    identityPoolId: 'ap-southeast-2:dd2e9e28-6d55-test-9f18-5e54e2b2f2ea',
    contactEmail: 'support@example.com',
    brandName: 'Performance Dashboard',
    frontendDomain: '',
    cognitoDomain: '',
    backendApi: 'https://test.execute-api.ap-southeast-2.amazonaws.com/prod/',
    samlProvider: '',
    enterpriseLoginLabel: 'Enterprise Sign-In',
    patternType: 'All',
};

window.EnvironmentConfig = env;