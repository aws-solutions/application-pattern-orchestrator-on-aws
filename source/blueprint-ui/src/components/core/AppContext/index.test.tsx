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
const mockCurrentAuthenticatedUser = jest.fn();

jest.mock('aws-amplify', () => {
    return {
        ...jest.requireActual('aws-amplify'),
        Auth: {
            currentAuthenticatedUser: mockCurrentAuthenticatedUser,
        },
    };
});

import { render, screen } from '@testing-library/react';
import { AppContextProvider } from './index';

describe('AppContext tests', () => {
    test('can get authenticated user', async () => {
        // arrange
        mockCurrentAuthenticatedUser.mockResolvedValueOnce({
            attributes: {
                email: 'test@amazon.com',
            },
            signInUserSession: {
                accessToken: {
                    payload: { 'cognito:groups': ['User'] },
                },
            },
        });

        // act
        render(
            <AppContextProvider>
                <p>Content</p>
            </AppContextProvider>
        );

        // assert
        expect(await screen.findByText('Content')).toBeInTheDocument();
    });
});
