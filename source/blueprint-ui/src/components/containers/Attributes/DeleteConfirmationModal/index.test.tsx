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
import { render, fireEvent } from '@testing-library/react';
import AttributeDeleteConfirmationModal from '.';

const attributeName = 'Test Attribute';

describe('AttributeDeleteConfirmationModal', () => {
    test('render', async () => {
        const mockOnSetVisible = jest.fn();
        const mockOnConfirmed = jest.fn();
        const { getByText, getByPlaceholderText } = render(
            <AttributeDeleteConfirmationModal
                attributeName={attributeName}
                visible={true}
                setVisible={mockOnSetVisible}
                onConfirmed={mockOnConfirmed}
            />
        );
        expect(getByText(`Delete ${attributeName}`)).toBeVisible();
        expect(
            getByText(`Delete Attribute ${attributeName}? This action cannot be undone.`)
        ).toBeVisible();

        // test confirm button
        fireEvent.change(getByPlaceholderText('delete'), {
            target: {
                value: 'delete',
            },
        });

        fireEvent.click(getByText('Delete'));
        expect(mockOnConfirmed).toBeCalledTimes(1);

        // test cancel button
        fireEvent.click(getByText('Cancel'));
        expect(mockOnSetVisible).toBeCalledWith(false);
    });
});
