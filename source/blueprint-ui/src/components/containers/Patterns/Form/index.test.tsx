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
import React from 'react';

import { render, act, fireEvent, RenderResult, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PatternForm from './index';

export const fixtureCreatePatternFormValues = {
    name: 'test-pattern-1',
    description: 'test pattern description',
    patternType: 'CDK',
    attributes: [
        {
            key: 'testAttribute',
            value: 'testAttrValue',
        },
        {
            key: 'testAttribute2',
            value: 'testAttrValue2',
        },
    ],
};

export const fixtureUpdatePatternFormValues = {
    patternId: 'test-pattern-1',
    ...fixtureCreatePatternFormValues,
};

export const fixtureListAttributesData = {
    testAttribute: [
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
            name: 'testAttribute:testAttrValue1',
            description: 'testAttribute1',
            key: 'testAttribute',
            value: 'testAttrValue2',
            metadata: {
                key1: 'value1',
            },
            createTime: '2021-11-17T06:02:52.748Z',
            lastUpdateTime: '2021-11-17T06:02:52.748Z',
        },
    ],
    testAttribute2: [
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

export const patternCreateFormAddAttribute = async (
    renderResult: RenderResult,
    attributeIndex: number
): Promise<void> => {
    const { getAllByTestId, findByRole } = renderResult;

    fireEvent.mouseDown(
        getAllByTestId(
            `form-array-attributes[${attributeIndex}]-attributes[${attributeIndex}].key`
        )[0].children[0]
    );
    const listboxAttributeKey = within(await findByRole('listbox'));
    fireEvent.click(
        listboxAttributeKey.getByText(
            fixtureCreatePatternFormValues.attributes[attributeIndex].key
        )
    );

    // Select Attribute Value
    fireEvent.mouseDown(
        getAllByTestId(
            `form-array-attributes[${attributeIndex}]-attributes[${attributeIndex}].value`
        )[0].children[0]
    );
    const listboxAttributeValue = within(await findByRole('listbox'));
    fireEvent.click(
        listboxAttributeValue.getByText(
            fixtureCreatePatternFormValues.attributes[attributeIndex].value
        )
    );
};

export const patternCreateFormNavigateAndAssert = async (
    renderResult: RenderResult
): Promise<void> => {
    const { getAllByRole, getByText, getByDisplayValue, getAllByText } = renderResult;

    // Create pattern first page
    expect(getByText('Create Pattern')).toBeInTheDocument();
    expect(getAllByText('Pattern Details').length).toBe(2);
    act(() => {
        fireEvent.change(
            getAllByRole('textbox').filter((element) => element.id === 'name')[0],
            { target: { value: fixtureCreatePatternFormValues.name } }
        );
        fireEvent.change(
            getAllByRole('textbox').filter((element) => element.id === 'description')[0],
            { target: { value: fixtureCreatePatternFormValues.description } }
        );
        fireEvent.click(getByDisplayValue(fixtureCreatePatternFormValues.patternType));
        fireEvent.click(getByText('Next'));
    });
    expect(getByText('Add new item')).toBeVisible();

    act(() => {
        fireEvent.click(getByText('Add new item'));
    });

    await act(async () => {
        // Select Attribute key
        await patternCreateFormAddAttribute(renderResult, 0);

        fireEvent.click(getByText('Add new item'));
        await patternCreateFormAddAttribute(renderResult, 1);
        fireEvent.click(getByText('Next'));
    });

    expect(getByText(fixtureCreatePatternFormValues.name)).toBeVisible();
    expect(getByText(fixtureCreatePatternFormValues.patternType)).toBeVisible();
    expect(getByText(fixtureCreatePatternFormValues.description)).toBeVisible();
    expect(getByText(fixtureCreatePatternFormValues.attributes[0].key)).toBeVisible();
    expect(getByText(fixtureCreatePatternFormValues.attributes[0].value)).toBeVisible();

    act(() => {
        fireEvent.click(getByText('Submit'));
    });
};

export const patternUpdateFormNavigateAndAssert = async (
    renderResult: RenderResult
): Promise<void> => {
    const { getAllByRole, getByText, getAllByText } = renderResult;

    // Create pattern first page
    expect(getByText('Update Pattern')).toBeInTheDocument();
    expect(getAllByText('Pattern Details').length).toBe(2);
    act(() => {
        fireEvent.change(
            getAllByRole('textbox').filter((element) => element.id === 'description')[0],
            { target: { value: fixtureCreatePatternFormValues.description } }
        );
        fireEvent.click(getByText('Next'));
    });

    await act(async () => {
        fireEvent.click(getByText('Next'));
    });

    expect(getByText(fixtureCreatePatternFormValues.name)).toBeVisible();
    expect(getByText(fixtureCreatePatternFormValues.patternType)).toBeVisible();
    expect(getByText(fixtureCreatePatternFormValues.description)).toBeVisible();
    expect(getByText(fixtureCreatePatternFormValues.attributes[0].key)).toBeVisible();
    expect(getByText(fixtureCreatePatternFormValues.attributes[0].value)).toBeVisible();

    act(() => {
        fireEvent.click(getByText('Submit'));
    });
};

describe('PatternForm', () => {
    test('render create', async () => {
        const mockOnSubmit = jest.fn();
        const mockOnCancel = jest.fn();

        const renderResult = render(
            <BrowserRouter>
                <PatternForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                    isSubmitting={false}
                    attributes={fixtureListAttributesData}
                    hidePatternType={false}
                />
            </BrowserRouter>
        );

        await patternCreateFormNavigateAndAssert(renderResult);

        expect(mockOnSubmit).toBeCalledWith(
            fixtureCreatePatternFormValues,
            expect.any(Object),
            expect.any(Function)
        );
    });
});
