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
import EnvConfig from './services/EnvConfig';

export const backendApiName = 'RAPM-API';

const redirectUri =
    window.location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : EnvConfig.redirectUri;

const amplifyConfig = {
    API: {
        endpoints: [
            {
                name: backendApiName,
                endpoint: EnvConfig.backendApi,
                region: EnvConfig.region,
            },
        ],
    },
    Auth: {
        region: EnvConfig.region,
        userPoolId: EnvConfig.userPoolId,
        userPoolWebClientId: EnvConfig.appClientId,
        identityPoolId: EnvConfig.identityPoolId,
        oauth: {
            domain: EnvConfig.cognitoDomain,
            scope: [
                'phone',
                'email',
                'openid',
                'profile',
                'aws.cognito.signin.user.admin',
            ],
            redirectSignIn: redirectUri,
            redirectSignOut: redirectUri,
            clientId: EnvConfig.appClientId,
            responseType: 'code',
        },
    },
};

export default amplifyConfig;
