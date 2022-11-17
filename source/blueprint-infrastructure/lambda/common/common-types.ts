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
/* eslint-disable @typescript-eslint/naming-convention */
import { UserAgent } from '@aws-sdk/types';

export const customUserAgentString =
    process.env['SOLUTION_USER_AGENT'] ?? 'AwsSolution/SO0178/v1.0.0';

export const customUserAgentV3: UserAgent = [
    [
        customUserAgentString.slice(0, customUserAgentString.lastIndexOf('/')),
        customUserAgentString.slice(customUserAgentString.lastIndexOf('/') + 1),
    ],
];

export const awsSdkConfiguration = {
    region: process.env.AWS_REGION,
    customUserAgent: customUserAgentV3,
};
