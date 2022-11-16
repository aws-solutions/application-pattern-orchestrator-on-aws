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
import AttributeDetail from '.';
import { formatDate } from '../../../../utils/helpers';
import { Attribute } from '../../../types/index';

const testDateStr1 = '2021-10-11T12:34:56Z';
const testDateStr2 = '2021-10-12T12:34:56Z';

const attribute1: Attribute = {
    name: 'hostingConstruct:lambda',
    key: 'hostingConstruct',
    value: 'lambda',
    description: 'hostingConstruct lambda',
    metadata: {},
    createTime: testDateStr1,
    lastUpdateTime: testDateStr2,
};

describe('AttributeDetail', () => {
    test('render attribute details', async () => {
        const { getByText } = render(<AttributeDetail attribute={attribute1} />);
        expect(getByText('hostingConstruct')).toBeInTheDocument();
        expect(getByText('lambda')).toBeInTheDocument();
        expect(getByText('hostingConstruct lambda')).toBeInTheDocument();
        expect(getByText(formatDate(new Date(testDateStr1)))).toBeInTheDocument();
        expect(getByText(formatDate(new Date(testDateStr2)))).toBeInTheDocument();
    });
});
