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
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, act, render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AttributeUpdate from '.';
import { useQuery, useMutation } from 'react-query';
import {
    fixtureCreateAttributeFormValues,
    fixtureUpdateAttributeFormValues,
    attribUpdateFormNavigateAndAssert,
} from '../../../containers/Attributes/Form/index.test';

// Mocks
const mockMutateFn = jest.fn();
const mockUseHistoryReplaceFn = jest.fn();
const mockUseHistoryGoBackFn = jest.fn();
const mockAddNotificationFn = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        replace: mockUseHistoryReplaceFn,
        goBack: mockUseHistoryGoBackFn,
    }),
}));
jest.mock('aws-northstar/layouts/AppLayout', () => ({
    ...jest.requireActual('aws-northstar/layouts/AppLayout'),
    useAppLayoutContext: () => ({
        addNotification: mockAddNotificationFn,
    }),
}));
jest.mock('react-query');

const mockedUseQuery = useQuery as jest.Mock<any>;
const mockedUseMutation = useMutation as jest.Mock<any>;

describe('Update Attribute Page', () => {
    let useMutationOptions: any;

    beforeEach(() => {
        mockAddNotificationFn.mockRestore();
        mockMutateFn.mockRestore();
        mockUseHistoryReplaceFn.mockRestore();
    });

    beforeAll(() => {
        mockedUseQuery.mockImplementation(() => ({
            isLoading: false,
            // Get Attribute details data
            data: {
                ...fixtureCreateAttributeFormValues,
                metadata: Object.fromEntries(
                    fixtureCreateAttributeFormValues.metadata.map((item) => [
                        item.key,
                        item.value,
                    ])
                ),
            },
            isError: false,
            error: null,
        }));

        mockedUseMutation.mockImplementation(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            (_mutationType: string, options?: any) => {
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
        mockMutateFn.mockImplementation((_request: any) => {
            useMutationOptions?.onError?.(new Error('test error'), {
                name: fixtureUpdateAttributeFormValues.key,
            });
        });

        const renderResult = render(
            <BrowserRouter>
                <AttributeUpdate />
            </BrowserRouter>
        );

        // Attribute form specific assertions
        attribUpdateFormNavigateAndAssert(renderResult);

        // Attribute page specific assertions
        expect(mockMutateFn).toHaveBeenCalledWith({
            ...fixtureUpdateAttributeFormValues,
            metadata: Object.fromEntries(
                fixtureUpdateAttributeFormValues.metadata.map((item) => [
                    item.key,
                    item.value,
                ])
            ),
        });
        // Assert error notification was called
        expect(mockAddNotificationFn).toHaveBeenCalledWith({
            content: 'test error',
            dismissible: true,
            header: `Update Attribute ${fixtureUpdateAttributeFormValues.key} Failed.`,
            id: expect.any(String),
            type: 'error',
        });
        // OnError shouldn't invoke useHistory.replace
        expect(mockUseHistoryReplaceFn).not.toHaveBeenCalled();
    });

    test('render page and submit - success scenario', async () => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        mockMutateFn.mockImplementation((_request: any) => {
            useMutationOptions?.onSuccess?.({
                name: fixtureUpdateAttributeFormValues.key,
            });
        });

        const renderResult = render(
            <BrowserRouter>
                <AttributeUpdate />
            </BrowserRouter>
        );

        // Attribute form specific assertions
        attribUpdateFormNavigateAndAssert(renderResult);

        // Attribute page specific assertions
        expect(mockMutateFn).toHaveBeenCalledWith({
            ...fixtureUpdateAttributeFormValues,
            metadata: Object.fromEntries(
                fixtureUpdateAttributeFormValues.metadata.map((item) => [
                    item.key,
                    item.value,
                ])
            ),
        });
        // Assert success notification is called
        expect(mockUseHistoryReplaceFn).toHaveBeenCalledWith(
            `/attributes/${fixtureUpdateAttributeFormValues.key}`,
            {
                notifications: [
                    {
                        dismissible: true,
                        header: `Update Attribute ${fixtureUpdateAttributeFormValues.key} Succeeded.`,
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
                <AttributeUpdate />
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
                <AttributeUpdate />
            </BrowserRouter>
        );

        expect(getByRole('progressbar')).toBeInTheDocument();
    });

    test('render page and loading returns error', async () => {
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

        mockedUseQuery.mockImplementation(() => ({
            isLoading: false,
            // Get Attribute details data
            data: null,
            isError: true,
            error: 'test error message',
        }));

        const { getByText } = render(
            <BrowserRouter>
                <AttributeUpdate />
            </BrowserRouter>
        );

        expect(getByText('test error message')).toBeInTheDocument();
    });
});
