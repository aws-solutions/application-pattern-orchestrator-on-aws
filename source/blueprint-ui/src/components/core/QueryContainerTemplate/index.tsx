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

import { ReactElement } from 'react';
import PageError from '../PageError';
import PageLoading from '../PageLoading';

export interface QueryContainerTemplateProps<T extends object> {
    loading: boolean;
    error?: string;
    data?: T;
    canErrorRetry?: boolean;
    onRetry?: () => void;
    children: (data: T) => ReactElement;
}

function QueryContainerTemplate<T extends object>({
    loading,
    error,
    data,
    children,
    canErrorRetry = false,
    onRetry,
}: QueryContainerTemplateProps<T>) {
    if (loading) {
        return <PageLoading />;
    }

    if (error) {
        return (
            <PageError
                retryOnClick={canErrorRetry ? onRetry : undefined}
                message={error}
            />
        );
    }

    if (data) {
        return children(data);
    }

    return null;
}

export default QueryContainerTemplate;
