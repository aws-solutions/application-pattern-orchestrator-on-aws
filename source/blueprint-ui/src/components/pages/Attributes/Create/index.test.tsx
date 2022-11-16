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
import { fireEvent, render, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AttributeCreate from '.';
import { useMutation } from 'react-query';
import {
    fixtureCreateAttributeFormValues,
    attribCreateFormNavigateAndAssert,
} from '../../../containers/Attributes/Form/index.test';

// Mocks
const mockMutateFn = jest.fn();
const mockUseHistoryReplaceFn = jest.fn();
const mockUseHistoryGoBackFn = jest.fn();
const mockAddNotificationFn = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    useHistory: () => ({
        replace: mockUseHistoryReplaceFn,
        goBack: mockUseHistoryGoBackFn,
    }),
}));

jest.mock('react-query');

jest.mock('aws-northstar/layouts/AppLayout', () => ({
    ...jest.requireActual('aws-northstar/layouts/AppLayout'),
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    useAppLayoutContext: () => ({
        addNotification: mockAddNotificationFn,
    }),
}));

const mockedUseMutation = useMutation as jest.Mock<unknown>;

describe('Create Attribute Page', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let useMutationOptions: any;

    beforeEach(() => {
        mockAddNotificationFn.mockRestore();
        mockMutateFn.mockRestore();
        mockUseHistoryReplaceFn.mockRestore();
    });

    beforeAll(() => {
        mockedUseMutation.mockImplementation(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            (_mutationType: string, options?: unknown) => {
                useMutationOptions = options;

                return {
                    isLoading: false,
                    mutate: mockMutateFn,
                };
            }
        );
    });

    test('render page and submit - failure scenario', async () => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        mockMutateFn.mockImplementation((_request: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            useMutationOptions.onError?.(new Error('test error'), {
                key: fixtureCreateAttributeFormValues.key,
                value: fixtureCreateAttributeFormValues.value,
            });
        });

        const renderResult = render(
            <BrowserRouter>
                <AttributeCreate />
            </BrowserRouter>
        );

        // Attribute form specific assertions
        attribCreateFormNavigateAndAssert(renderResult);

        // Attribute page specific assertions
        expect(mockMutateFn).toHaveBeenCalledWith({
            ...fixtureCreateAttributeFormValues,
            metadata: Object.fromEntries(
                fixtureCreateAttributeFormValues.metadata.map((item) => [
                    item.key,
                    item.value,
                ])
            ),
        });
        // Assert error notification was called
        expect(mockAddNotificationFn).toHaveBeenCalledWith({
            content: 'test error',
            dismissible: true,
            header: `Create Attribute ${fixtureCreateAttributeFormValues.key}:${fixtureCreateAttributeFormValues.value} Failed.`,
            id: expect.any(String),
            type: 'error',
        });
        // OnError shouldn't invoke useHistory.replace
        expect(mockUseHistoryReplaceFn).not.toHaveBeenCalled();
    });

    test('render page and submit - success scenario', async () => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        mockMutateFn.mockImplementation((_request: unknown) => {
            useMutationOptions?.onSuccess?.({
                name: fixtureCreateAttributeFormValues.key,
            });
        });

        const renderResult = render(
            <BrowserRouter>
                <AttributeCreate />
            </BrowserRouter>
        );

        // Attribute form specific assertions
        attribCreateFormNavigateAndAssert(renderResult);

        // Attribute page specific assertions
        expect(mockMutateFn).toHaveBeenCalledWith({
            ...fixtureCreateAttributeFormValues,
            metadata: Object.fromEntries(
                fixtureCreateAttributeFormValues.metadata.map((item) => [
                    item.key,
                    item.value,
                ])
            ),
        });
        // Assert success notification is called
        expect(mockUseHistoryReplaceFn).toHaveBeenCalledWith(
            `/attributes/${fixtureCreateAttributeFormValues.key}`,
            {
                notifications: [
                    {
                        dismissible: true,
                        header: `Create Attribute ${fixtureCreateAttributeFormValues.key} Succeeded.`,
                        id: expect.any(String),
                        type: 'success',
                    },
                ],
            }
        );
        // Assert error notification has not been called
        expect(mockAddNotificationFn).not.toHaveBeenCalled();
    });

    test('render page and click cancel', async () => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        mockMutateFn.mockImplementation((_request: unknown) => {
            useMutationOptions?.onSuccess?.({
                name: fixtureCreateAttributeFormValues.key,
            });
        });

        const { getByText } = render(
            <BrowserRouter>
                <AttributeCreate />
            </BrowserRouter>
        );

        act(() => {
            fireEvent.click(getByText('Cancel'));
        });

        expect(mockUseHistoryGoBackFn).toHaveBeenCalled();
    });

    test('render page and loading in progress', async () => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        mockedUseMutation.mockImplementationOnce(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            (_mutationType: string, options?: unknown) => {
                useMutationOptions = options;

                return {
                    isLoading: true,
                    mutate: mockMutateFn,
                };
            }
        );

        const { getByRole } = render(
            <BrowserRouter>
                <AttributeCreate />
            </BrowserRouter>
        );

        expect(getByRole('progressbar')).toBeInTheDocument();
    });
});
