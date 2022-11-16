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

import { render, fireEvent, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AttributesContainer from '.';
import { useQuery, useMutation } from 'react-query';

const mockAddNotificationFn = jest.fn();
const mockMutateFn = jest.fn();

jest.mock('react-query', () => ({
    ...jest.requireActual('react-query'),
    useQuery: jest.fn(),
    useMutation: jest.fn(),
}));
jest.mock('aws-northstar/layouts/AppLayout', () => ({
    ...jest.requireActual('aws-northstar/layouts/AppLayout'),
    useAppLayoutContext: () => ({
        addNotification: mockAddNotificationFn,
    }),
}));
const mockedUseQuery = useQuery as jest.Mock<any>;
const mockedUseMutation = useMutation as jest.Mock<any>;

const fixtureGetAllAttributesResp = {
    results: [
        {
            name: 'SecurityLevel:Medium',
            description: '',
            key: 'SecurityLevel',
            value: 'Medium',
            metadata: {},
            createTime: '2022-07-17T12:03:58.552Z',
            lastUpdateTime: '2022-07-17T12:03:58.552Z',
        },
        {
            name: 'DataClassification:PII',
            description: '',
            key: 'DataClassification',
            value: 'PII',
            metadata: {},
            createTime: '2022-07-17T12:03:29.562Z',
            lastUpdateTime: '2022-07-17T12:03:29.562Z',
        },
    ],
};

const fixtureNoAttributesResp = {
    results: [],
};

describe('Attribute Details Page', () => {
    let useMutationOptions: any;
    beforeEach(() => {
        mockAddNotificationFn.mockRestore();
        mockMutateFn.mockRestore();
        mockedUseQuery.mockRestore();
    });

    test('render page when there are attributes', async () => {
        mockedUseQuery.mockImplementation(() => ({
            isLoading: false,
            data: fixtureGetAllAttributesResp,
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
        // eslint-disable-next-line @typescript-eslint/naming-convention
        mockMutateFn.mockImplementation((_request: any) => {
            useMutationOptions?.onSuccess?.({});
        });

        const { getByText, getAllByText, getAllByRole } = render(
            <BrowserRouter>
                <AttributesContainer />
            </BrowserRouter>
        );
        expect(
            getByText(`Attributes (${fixtureGetAllAttributesResp.results.length})`)
        ).toBeInTheDocument();
        for (const attribute of fixtureGetAllAttributesResp.results) {
            expect(getByText(attribute.key)).toBeInTheDocument();
            expect(getByText(attribute.value)).toBeInTheDocument();
        }

        // select a attribute
        await act(async () => {
            const radioButton = getAllByRole('radio')[1];
            radioButton.click();
        });

        await waitFor(() => {
            expect(getAllByText('Delete')[0].parentElement).toBeEnabled();
            expect(getAllByText('Update')[0].parentElement).toBeEnabled();
        });
        act(() => {
            fireEvent.click(getAllByText('Delete')[0]);
        });
        await waitFor(() => {
            expect(getByText('Delete DataClassification:PII')).toBeInTheDocument();
        });
        // Delete confirmation popup
        act(() => {
            fireEvent.change(getAllByRole('textbox')[0], {
                target: { value: 'delete' },
            });
        });
        await waitFor(() => {
            expect(getAllByText('Delete')[1].parentElement).toBeEnabled();
        });
        act(() => {
            fireEvent.click(getAllByText('Delete')[1]);
        });
        expect(mockMutateFn).toHaveBeenCalledWith({
            name: fixtureGetAllAttributesResp.results[1].name,
        });

        expect(mockAddNotificationFn).toHaveBeenCalledWith({
            id: expect.any(String),
            type: 'success',
            header: `Delete Attribute ${fixtureGetAllAttributesResp.results[1].name} Succeeded.`,
            dismissible: true,
        });
    });

    test('delete attribute error response', async () => {
        mockedUseQuery.mockImplementation(() => ({
            isLoading: false,
            data: fixtureGetAllAttributesResp,
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
        // eslint-disable-next-line @typescript-eslint/naming-convention
        mockMutateFn.mockImplementation((_request: any) => {
            useMutationOptions?.onError?.(new Error('test error'), {});
        });

        const { getByText, getAllByText, getAllByRole } = render(
            <BrowserRouter>
                <AttributesContainer />
            </BrowserRouter>
        );
        expect(
            getByText(`Attributes (${fixtureGetAllAttributesResp.results.length})`)
        ).toBeInTheDocument();
        for (const attribute of fixtureGetAllAttributesResp.results) {
            expect(getByText(attribute.key)).toBeInTheDocument();
            expect(getByText(attribute.value)).toBeInTheDocument();
        }

        // select a attribute
        await act(async () => {
            const radioButton = getAllByRole('radio')[1];
            radioButton.click();
        });

        await waitFor(() => {
            expect(getAllByText('Delete')[0].parentElement).toBeEnabled();
            expect(getAllByText('Update')[0].parentElement).toBeEnabled();
        });
        act(() => {
            fireEvent.click(getAllByText('Delete')[0]);
        });
        await waitFor(() => {
            expect(getByText('Delete DataClassification:PII')).toBeInTheDocument();
        });
        // Delete confirmation popup
        act(() => {
            fireEvent.change(getAllByRole('textbox')[0], {
                target: { value: 'delete' },
            });
        });
        await waitFor(() => {
            expect(getAllByText('Delete')[1].parentElement).toBeEnabled();
        });
        act(() => {
            fireEvent.click(getAllByText('Delete')[1]);
        });
        expect(mockMutateFn).toHaveBeenCalledWith({
            name: fixtureGetAllAttributesResp.results[1].name,
        });

        expect(mockAddNotificationFn).toHaveBeenCalledWith({
            id: expect.any(String),
            type: 'error',
            header: `Delete Attribute ${fixtureGetAllAttributesResp.results[1].name} Failed.`,
            dismissible: true,
            content: 'test error',
        });
    });

    test('render page when there are no attributes', async () => {
        mockedUseQuery.mockImplementation(() => ({
            isLoading: false,
            data: fixtureNoAttributesResp,
            isError: false,
            error: null,
        }));
        const { getByText } = render(
            <BrowserRouter>
                <AttributesContainer />
            </BrowserRouter>
        );
        expect(getByText(`Attributes (0)`)).toBeInTheDocument();
        expect(getByText('No records found')).toBeInTheDocument();
    });
});
