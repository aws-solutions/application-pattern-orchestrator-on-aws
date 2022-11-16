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
const mockFederatedSignIn = jest.fn();
const mockSetUser = jest.fn();
const mockUseAppContext = jest.fn();

jest.mock('aws-amplify', () => {
    return {
        ...jest.requireActual('aws-amplify'),
        Auth: {
            currentAuthenticatedUser: mockCurrentAuthenticatedUser,
            federatedSignIn: mockFederatedSignIn,
        },
    };
});

jest.mock('../AppContext', () => {
    return {
        ...jest.requireActual('../AppContext'),
        useAppContext: mockUseAppContext,
    };
});

import { Authenticate } from './index';
import { BrowserRouter } from 'react-router-dom';
import { render, screen, act, fireEvent } from '@testing-library/react';

describe('Authenticate component tests', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockUseAppContext.mockReturnValue({ setUser: mockSetUser });
    });

    test('displays login page for un-authenticated user', () => {
        // arrange
        mockCurrentAuthenticatedUser.mockRejectedValueOnce({});

        // act
        render(
            <BrowserRouter>
                <Authenticate>
                    <></>
                </Authenticate>
            </BrowserRouter>
        );

        // assert
        expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    test('signs in using hosted ui', () => {
        // arrange
        mockCurrentAuthenticatedUser.mockRejectedValueOnce({});

        // act
        render(
            <BrowserRouter>
                <Authenticate />
            </BrowserRouter>
        );
        act(() => {
            fireEvent.click(screen.getByText('Sign in'));
        });

        // assert
        expect(mockFederatedSignIn).toHaveBeenCalled();
    });

    test('display requested content for authenticated user', async () => {
        // arrange
        mockCurrentAuthenticatedUser.mockResolvedValueOnce({
            attributes: {
                email: 'test@amazon.com',
            },
            signInUserSession: {
                idToken: {
                    payload: { 'cognito:groups': ['User'] },
                },
            },
            username: 'test_user',
        });

        // act
        await act(async () => {
            render(
                <BrowserRouter>
                    <Authenticate>
                        <p>Authenticated</p>
                    </Authenticate>
                </BrowserRouter>
            );
        });

        // assert
        expect(mockSetUser).toHaveBeenCalledWith({
            email: 'test@amazon.com',
        });
    });

    test('do nothing when user already exists in app context', async () => {
        // arrange
        mockUseAppContext.mockReturnValueOnce({
            user: {
                email: 'test@amazon.com',
            },
        });

        await act(async () => {
            render(
                <BrowserRouter>
                    <Authenticate>
                        <p>Authenticated</p>
                    </Authenticate>
                </BrowserRouter>
            );
        });

        // assert
        expect(mockCurrentAuthenticatedUser).not.toHaveBeenCalled();
    });
});
