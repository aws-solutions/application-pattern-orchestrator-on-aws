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
import { render } from '@testing-library/react';
import AttributeReview from '.';
import { BrowserRouter } from 'react-router-dom';
import { AttributeFormData } from '../../../../../types/index';

const attrFormValues: AttributeFormData = {
    key: 'testkey',
    value: 'testval',
    description: 'testdesc',
    metadata: [],
};

describe('AttributeReview', () => {
    test('render review', async () => {
        // Attribute Review page
        const { getByText } = render(
            <BrowserRouter>
                <AttributeReview data={attrFormValues} />
            </BrowserRouter>
        );

        // Review page
        expect(getByText(attrFormValues.key)).toBeInTheDocument();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(getByText(attrFormValues.description!)).toBeInTheDocument();
        expect(getByText(attrFormValues.value)).toBeInTheDocument();
    }, 20000);
});
