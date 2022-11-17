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
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AttributeTable from '.';
import { AttributeSummary } from '../../../types/index';

const attributes: AttributeSummary[] = [
    {
        name: 'hostingConstruct:lambda',
        key: 'hostingConstruct',
        value: 'lambda',
        createTime: '1',
        lastUpdateTime: '2',
    },
    {
        name: 'hostingConstruct:ecs',
        key: 'hostingConstruct',
        value: 'ecs',
        createTime: '3',
        lastUpdateTime: '4',
    },
    {
        name: 'dataClassification:PII',
        key: 'dataClassification',
        value: 'PII',
        createTime: '5',
        lastUpdateTime: '6',
    },
];
jest.useRealTimers();
describe('AttributeTable', () => {
    test('render', async () => {
        const mockOnDelete = jest.fn();

        const { getByText, getAllByRole, getAllByText } = render(
            <BrowserRouter>
                <AttributeTable
                    attributes={attributes}
                    disableRowSelect={false}
                    disableToolbar={false}
                    disableCreate={false}
                    disableDelete={false}
                    onDeleteAttribute={mockOnDelete}
                />
            </BrowserRouter>
        );

        expect(getByText('Attributes (3)')).toBeInTheDocument();
        expect(getAllByText('hostingConstruct').length).toBe(2);
        expect(getByText('lambda')).toBeInTheDocument();
        expect(getByText('ecs')).toBeInTheDocument();
        expect(getByText('dataClassification')).toBeInTheDocument();
        expect(getByText('PII')).toBeInTheDocument();

        // buttons
        expect(getByText('Delete').parentElement).toBeDisabled();
        expect(getByText('Update').parentElement).toBeDisabled();
        expect(getByText('Add new Attribute').parentElement).toBeEnabled();

        // three radio buttons for selection
        expect(getAllByRole('radio').length).toBe(3);

        // select a attribute
        await act(async () => {
            const radioButton = getAllByRole('radio')[1];
            radioButton.click();
        });

        await waitFor(() => {
            expect(getByText('Delete').parentElement).toBeEnabled();
            expect(getByText('Update').parentElement).toBeEnabled();
        });

        act(() => {
            fireEvent.click(getByText('Delete'));
        });
        expect(mockOnDelete).toBeCalledWith([
            {
                name: 'hostingConstruct:ecs',
                key: 'hostingConstruct',
                value: 'ecs',
                createTime: '3',
                lastUpdateTime: '4',
            },
        ]);
    });
});
