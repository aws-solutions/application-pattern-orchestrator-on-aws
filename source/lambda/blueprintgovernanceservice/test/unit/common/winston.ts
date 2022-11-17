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
/* eslint-disable */
export const mockLogFunction = jest.fn();

interface LoggerType {
    log: (level: string, message: string, ...meta: any[]) => LoggerType;
}

class MockLogger implements LoggerType {
    log = mockLogFunction;
    child(): LoggerType {
        return new MockLogger();
    }
}

export default {
    createLogger: (): LoggerType => {
        return new MockLogger();
    },
    format: {
        simple: jest.fn(),

        combine: jest.fn(),
        timestamp: jest.fn(),
        splat: jest.fn(),
        json: jest.fn(),
    },
    transports: {
        Console: jest.fn(),
    },
};
