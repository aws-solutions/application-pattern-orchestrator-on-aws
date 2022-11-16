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
import {
    CloudFormationCustomResourceEvent,
    CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import { sendAnonymousMetric } from '../common/metrics/operational-metric';
import { v4 as uuidv4 } from 'uuid';

export async function handler(
    event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceSuccessResponse> {
    const {
        awsSolutionId,
        awsSolutionVersion,
        awsRegion,
        sendAnonymousData,
        retainData,
        patternType,
    } = event.ResourceProperties;

    // Randomly generated, unique identifier for each Solution deployment
    let anonymousDataUUID = '';

    switch (event.RequestType) {
        case 'Create':
            // only create anonymous uuid for create event
            anonymousDataUUID = uuidv4();
            break;

        case 'Update':
        case 'Delete':
            anonymousDataUUID = event.PhysicalResourceId;
            break;
    }

    // send anonymous metrics data
    const result = await sendAnonymousMetric({
        awsSolutionId,
        awsSolutionVersion,
        anonymousDataUUID,
        data: {
            region: awsRegion,
            requestType: event.RequestType,
            sendAnonymousData,
            retainData,
            patternType,
        },
    });

    return {
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        PhysicalResourceId: anonymousDataUUID,
        Data: {
            anonymousDataUUID,
            sendAnonymousData,
        },
        StackId: event.StackId,
        Status: 'SUCCESS',
        Reason: result,
    };
}
