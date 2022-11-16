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
import axios, { AxiosRequestConfig } from 'axios';
import moment from 'moment';
import { getLogger } from '../BaseContainer';

const METRICS_ENDPOINT = 'https://metrics.awssolutionsbuilder.com/generic';
const logger = getLogger('OperationalMetrics');

export interface MetricsPayload {
    awsSolutionId: string;
    awsSolutionVersion: string;
    anonymousDataUUID: string;
    data: unknown;
}

export async function sendAnonymousMetric(payload: MetricsPayload): Promise<string> {
    try {
        const payloadStr = JSON.stringify({
            Solution: payload.awsSolutionId,
            Version: payload.awsSolutionVersion,
            UUID: payload.anonymousDataUUID,
            TimeStamp: moment.utc().format('YYYY-MM-DD HH:mm:ss.S'),
            Data: payload.data,
        });

        const config: AxiosRequestConfig = {
            headers: {
                'content-type': 'application/json',
                'content-length': payloadStr.length,
            },
        };

        logger.info(`Sending anonymous metric ${JSON.stringify(payloadStr)}`);
        const response = await axios.post(METRICS_ENDPOINT, payloadStr, config);
        logger.info(
            `Anonymous metric response: ${response.statusText} (${response.status})`
        );
        return 'Succeeded';
    } catch (err) {
        // Log the error
        logger.error(`Error sending anonymous metric: ${JSON.stringify(err)}`);
        return (err as Error).message;
    }
}
