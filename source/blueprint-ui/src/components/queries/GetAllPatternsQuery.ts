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
import { GetPatternsApiResponse } from '../types';
import { authHeaders } from './auth';

async function getAllPatternsQuery(): Promise<GetPatternsApiResponse> {
    const headers = await authHeaders();
    const path = '/patterns';
    const myInit = {
        headers,
    };

    return API.get(backendApiName, path, myInit);
}

export default getAllPatternsQuery;
