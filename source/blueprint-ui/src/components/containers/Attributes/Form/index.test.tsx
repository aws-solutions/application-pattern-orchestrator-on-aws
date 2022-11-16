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
import { render, fireEvent, act, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AttributeForm from '.';
import { AttributeFormData } from '../../../types/index';

export const fixtureCreateAttributeFormValues: AttributeFormData = {
    key: 'TestAttributeKey',
    value: 'TestAttributeValue',
    description: 'Test description',
    metadata: [{ key: 'test-metadata-key', value: 'test-metadata-value' }],
};

export const fixtureUpdateAttributeFormValues: AttributeFormData = {
    ...fixtureCreateAttributeFormValues,
    description: 'Updated test description',
    metadata: [
        { key: 'updated-test-metadata-key', value: 'updated-test-metadata-value' },
    ],
};

export const attribCreateFormNavigateAndAssert = (renderResult: RenderResult): void => {
    const { getAllByRole, getByText, getAllByText } = renderResult;

    // Create attribute first page
    expect(getByText('Create Attribute')).toBeInTheDocument();
    expect(getAllByText('Attribute Details').length).toBe(2);
    act(() => {
        fireEvent.change(
            getAllByRole('textbox').filter((element) => element.id === 'key')[0],
            { target: { value: fixtureCreateAttributeFormValues.key } }
        );
        fireEvent.change(
            getAllByRole('textbox').filter((element) => element.id === 'value')[0],
            { target: { value: fixtureCreateAttributeFormValues.value } }
        );
        fireEvent.change(
            getAllByRole('textbox').filter((element) => element.id === 'description')[0],
            { target: { value: fixtureCreateAttributeFormValues.description } }
        );
        fireEvent.click(getByText('Next'));
    });
    expect(getByText('Add new item')).toBeVisible();

    // Add new metadata page
    act(() => {
        fireEvent.click(getByText('Add new item'));
    });

    act(() => {
        fireEvent.change(
            getAllByRole('textbox').filter(
                (element) => element.id === 'metadata[0].key'
            )[0],
            { target: { value: fixtureCreateAttributeFormValues.metadata[0].key } }
        );
        fireEvent.change(
            getAllByRole('textbox').filter(
                (element) => element.id === 'metadata[0].value'
            )[0],
            { target: { value: fixtureCreateAttributeFormValues.metadata[0].value } }
        );
    });

    // Review page
    act(() => {
        fireEvent.click(getByText('Next'));
    });

    expect(getByText(fixtureCreateAttributeFormValues.key)).toBeVisible();
    expect(getByText(fixtureCreateAttributeFormValues.value)).toBeVisible();
    expect(getByText(fixtureCreateAttributeFormValues.description)).toBeVisible();
    expect(getByText(fixtureCreateAttributeFormValues.metadata[0].key)).toBeVisible();
    expect(getByText(fixtureCreateAttributeFormValues.metadata[0].value)).toBeVisible();

    act(() => {
        fireEvent.click(getByText('Submit'));
    });
};

export const attribUpdateFormNavigateAndAssert = (renderResult: RenderResult): void => {
    const { getAllByRole, getByText, getAllByText } = renderResult;

    // Update attribute first page
    act(() => {
        fireEvent.change(
            getAllByRole('textbox').filter((element) => element.id === 'description')[0],
            { target: { value: fixtureUpdateAttributeFormValues.description } }
        );
        fireEvent.click(getByText('Next'));
    });

    // Add metadata page
    expect(getByText('Add new item')).toBeVisible();

    act(() => {
        fireEvent.click(getAllByText('Remove')[0]);
        fireEvent.click(getByText('Add new item'));
    });

    act(() => {
        fireEvent.change(
            getAllByRole('textbox').filter(
                (element) => element.id === 'metadata[0].key'
            )[0],
            { target: { value: fixtureUpdateAttributeFormValues.metadata[0].key } }
        );
        fireEvent.change(
            getAllByRole('textbox').filter(
                (element) => element.id === 'metadata[0].value'
            )[0],
            { target: { value: fixtureUpdateAttributeFormValues.metadata[0].value } }
        );
    });

    // Review page
    act(() => {
        fireEvent.click(getByText('Next'));
    });

    expect(getByText(fixtureUpdateAttributeFormValues.key)).toBeVisible();
    expect(getByText(fixtureUpdateAttributeFormValues.value)).toBeVisible();
    expect(getByText(fixtureUpdateAttributeFormValues.description)).toBeVisible();
    expect(getByText(fixtureUpdateAttributeFormValues.metadata[0].key)).toBeVisible();
    expect(getByText(fixtureUpdateAttributeFormValues.metadata[0].value)).toBeVisible();
    expect(getByText('Submit')).toBeVisible();

    act(() => {
        fireEvent.click(getByText('Submit'));
    });
};

describe('AttributeForm', () => {
    test('render create', () => {
        const mockOnSubmit = jest.fn();
        const mockOnCancel = jest.fn();

        const renderResult = render(
            <BrowserRouter>
                <AttributeForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </BrowserRouter>
        );

        attribCreateFormNavigateAndAssert(renderResult);
        expect(mockOnSubmit).toBeCalledWith(
            fixtureCreateAttributeFormValues,
            expect.any(Object),
            expect.any(Function)
        );
    });

    test('render update', () => {
        const mockOnSubmit = jest.fn();
        const mockOnCancel = jest.fn();

        const renderResult = render(
            <BrowserRouter>
                <AttributeForm
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                    isUpdate={true}
                    initialValues={fixtureCreateAttributeFormValues}
                />
            </BrowserRouter>
        );

        attribUpdateFormNavigateAndAssert(renderResult);

        expect(mockOnSubmit).toBeCalledWith(
            fixtureUpdateAttributeFormValues,
            expect.any(Object),
            expect.any(Function)
        );
    });
});
