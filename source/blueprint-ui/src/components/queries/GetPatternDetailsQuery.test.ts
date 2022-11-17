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
import { API } from 'aws-amplify';
import { backendApiName } from '../../amplify-config';
import { authHeaders } from './auth';
import GetPatternDetailsQuery from './GetPatternDetailsQuery';

jest.mock('aws-amplify', () => ({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    API: {
        get: jest.fn(),
    },
}));
jest.mock('./auth');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuthHeaders = authHeaders as jest.Mock<any>;

describe('GetPatternDetailsQuery', () => {
    test('GetPatternDetailsQuery invoke', async () => {
        const headers = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Authorization: 'Bearer abcd',
        };
        mockAuthHeaders.mockResolvedValueOnce(headers);
        const mockPatternId = 'test-patter-1';

        await GetPatternDetailsQuery(mockPatternId);
        expect(API.get).toHaveBeenCalledWith(
            backendApiName,
            `/patterns/${mockPatternId}`,
            {
                headers,
            }
        );
    });
});
