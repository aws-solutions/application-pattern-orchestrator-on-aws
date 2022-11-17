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
import {
    CreateAttributeParams,
    CreatePatternRequestProps,
    DeleteAttributeParams,
    UpdateAttributeParams,
    UpdatePatternRequestProps,
} from '../types';
import { authHeaders } from './auth';
import { backendApiName } from '../../amplify-config';

export async function createPattern(request: CreatePatternRequestProps) {
    const headers = await authHeaders();
    const path = '/patterns';
    const myInit = {
        body: request,
        headers,
    };
    try {
        return await API.post(backendApiName, path, myInit);
    } catch (error) {
        throw new Error(error.response?.data['Error Message']);
    }
}

export async function updatePatternMetaData(request: UpdatePatternRequestProps) {
    const headers = await authHeaders();
    const path = `/patterns/${request.patternId}`;
    const myInit = {
        body: request,
        headers,
    };
    try {
        return await API.put(backendApiName, path, myInit);
    } catch (error) {
        throw new Error(error.response?.data?.error);
    }
}

export async function createAttribute(request: CreateAttributeParams) {
    const headers = await authHeaders();
    const path = '/attributes';
    const myInit = {
        body: request,
        headers,
    };
    try {
        return await API.post(backendApiName, path, myInit);
    } catch (error) {
        throw new Error(error.response?.data?.error);
    }
}

export async function deleteAttribute(request: DeleteAttributeParams) {
    const headers = await authHeaders();
    const path = `/attributes/${request.name}`;
    const myInit = {
        headers,
    };
    try {
        return await API.del(backendApiName, path, myInit);
    } catch (error) {
        throw new Error(error.response?.data?.error);
    }
}

export async function updateAttribute(request: UpdateAttributeParams) {
    const headers = await authHeaders();
    const path = `/attributes/${request.name}`;
    const myInit = {
        body: request,
        headers,
    };
    try {
        return await API.put(backendApiName, path, myInit);
    } catch (error) {
        throw new Error(error.response?.data?.error);
    }
}

export async function setupNotification(request: {
    patternId: string;
    email: string;
    subscribe: boolean;
}) {
    const headers = await authHeaders();
    const path = `/subscriptions`;
    const init = {
        body: { patternId: request.patternId, email: request.email },
        headers,
    };

    request.subscribe
        ? await API.post(backendApiName, path, init)
        : await API.del(backendApiName, path, init);
}
