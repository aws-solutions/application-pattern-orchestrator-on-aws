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
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/react';
import * as ReactQuery from 'react-query';
import GetAllAttributesQuery from '../../../queries/GetAllAttributesQuery';

import { BrowserRouter } from 'react-router-dom';

import PatternCreate from '.';
import React from 'react';
import { UseMutationResult, UseQueryResult } from 'react-query';
import {
    fixtureCreatePatternFormValues,
    patternCreateFormNavigateAndAssert,
} from '../../../containers/Patterns/Form/index.test';

// Mocks
const mockMutateFn = jest.fn();
const mockUseHistoryReplaceFn = jest.fn();
const mockUseHistoryPushFn = jest.fn();
const mockAddNotificationFn = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockUseHistoryPushFn,
        replace: mockUseHistoryReplaceFn,
    }),
}));

jest.mock('aws-northstar/layouts/AppLayout', () => ({
    ...jest.requireActual('aws-northstar/layouts/AppLayout'),
    useAppLayoutContext: () => ({
        addNotification: mockAddNotificationFn,
    }),
}));

jest.mock('react-query', () => ({
    ...jest.requireActual('react-query'),
    useQuery: jest.fn(),
    useMutation: jest.fn(),
}));

const mockReactQuery = ReactQuery as jest.Mocked<typeof ReactQuery>;

const fixtureListAttributesData = {
    results: [
        {
            name: 'testAttribute:testAttrValue',
            description: 'testAttribute',
            key: 'testAttribute',
            value: 'testAttrValue',
            metadata: {
                key1: 'value1',
            },
            createTime: '2021-11-17T06:02:52.748Z',
            lastUpdateTime: '2021-11-17T06:02:52.748Z',
        },
        {
            name: 'testAttribute2:testAttrValue2',
            description: 'testAttribute2',
            key: 'testAttribute2',
            value: 'testAttrValue2',
            metadata: {
                key1: 'value1',
            },
            createTime: '2021-11-17T06:02:52.748Z',
            lastUpdateTime: '2021-11-17T06:02:52.748Z',
        },
    ],
};

describe('PatternCreate', () => {
    let useMutationOptions: any;

    beforeEach(() => {
        mockAddNotificationFn.mockRestore();
        mockMutateFn.mockRestore();
        mockUseHistoryReplaceFn.mockRestore();
    });

    beforeAll(() => {
        mockReactQuery.useMutation.mockImplementation(
            (_mutationFn: any, options?: any) => {
                useMutationOptions = options;

                return {
                    isLoading: false,
                    mutate: mockMutateFn,
                } as unknown as UseMutationResult;
            }
        );
    });

    test('render create on success', async () => {
        mockReactQuery.useQuery.mockReturnValue({
            isLoading: false,
            isError: false,
            data: fixtureListAttributesData,
        } as UseQueryResult);

        mockMutateFn.mockImplementation((_request: any) => {
            useMutationOptions.onSuccess(null, fixtureCreatePatternFormValues);
        });

        const renderResult = render(
            <BrowserRouter>
                <PatternCreate />
            </BrowserRouter>
        );

        await patternCreateFormNavigateAndAssert(renderResult);

        expect(mockReactQuery.useQuery).toBeCalledWith(
            'listAttributes',
            GetAllAttributesQuery,
            expect.anything()
        );

        expect(mockMutateFn).toHaveBeenCalledWith({
            name: fixtureCreatePatternFormValues.name,
            description: fixtureCreatePatternFormValues.description,
            patternType: fixtureCreatePatternFormValues.patternType,
            attributes: Object.fromEntries(
                fixtureCreatePatternFormValues.attributes.map((item) => [
                    item.key,
                    item.value,
                ])
            ),
        });

        expect(mockUseHistoryPushFn).toHaveBeenCalledWith(
            `/patterns/${fixtureCreatePatternFormValues.name}`
        );

        expect(mockAddNotificationFn).toHaveBeenCalledWith({
            dismissible: true,
            header: `Successfully created the pattern ${fixtureCreatePatternFormValues.name}`,
            id: expect.any(String),
            type: 'success',
        });
    });

    test('render create on error', async () => {
        mockReactQuery.useQuery.mockReturnValue({
            isLoading: false,
            isError: false,
            data: fixtureListAttributesData,
        } as UseQueryResult);

        mockMutateFn.mockImplementation((_request: any) => {
            useMutationOptions.onError(
                { message: 'test error message' },
                fixtureCreatePatternFormValues
            );
        });

        const renderResult = render(
            <BrowserRouter>
                <PatternCreate />
            </BrowserRouter>
        );

        await patternCreateFormNavigateAndAssert(renderResult);

        expect(mockAddNotificationFn).toHaveBeenCalledWith({
            header: `Failed to create the pattern ${fixtureCreatePatternFormValues.name}`,
            id: expect.anything(),
            type: 'error',
            dismissible: true,
            content: 'test error message',
        });
    });

    test('render the loading errors', () => {
        const errorMsg = 'Unable to load attributes';
        mockReactQuery.useQuery.mockReturnValueOnce({
            isLoading: false,
            isError: true,
            data: undefined,
            error: errorMsg,
        } as UseQueryResult);

        const { getByText } = render(
            <BrowserRouter>
                <PatternCreate />
            </BrowserRouter>
        );
        // expect(mockReactQuery.useQuery).toBeCalledTimes(1);
        expect(mockReactQuery.useQuery).toBeCalledWith(
            'listAttributes',
            GetAllAttributesQuery,
            expect.anything()
        );
        expect(getByText(errorMsg)).toBeInTheDocument();
    });

    test('render the loading in progress', () => {
        mockReactQuery.useQuery.mockReturnValueOnce({
            isLoading: true,
            data: undefined,
        } as UseQueryResult);

        const { getByRole } = render(
            <BrowserRouter>
                <PatternCreate />
            </BrowserRouter>
        );
        expect(mockReactQuery.useQuery).toBeCalledWith(
            'listAttributes',
            GetAllAttributesQuery,
            expect.anything()
        );
        expect(getByRole('progressbar')).toBeInTheDocument();
    });
});
