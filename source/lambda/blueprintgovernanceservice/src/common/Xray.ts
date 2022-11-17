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
import AWS from 'aws-sdk';
import https from 'https';
import AWSXRay from 'aws-xray-sdk';
import { Logger } from './logging';
import { container } from 'tsyringe';

const logger: Logger = container.resolve('Logger');

// SAM Local doesn't support XRay: https://github.com/aws/aws-sam-cli/issues/217
// Only enable XRay when it is not SAM
if (!process.env.AWS_SAM_LOCAL) {
    // Capture all downstream AWS requests
    AWSXRay.captureAWS(AWS);

    // Capture all outgoing https requests
    AWSXRay.captureHTTPsGlobal(https, true);

    // Set XRay Logger
    AWSXRay.setLogger(logger);
}
