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
import PageError from './index';

describe('Page Error', () => {
    test('render', () => {
        const { getByText } = render(
            <PageError
                header="Header Text"
                message="Message Text"
                retryOnClick={jest.fn()}
            />
        );
        expect(getByText('Header Text')).toBeInTheDocument();
        expect(getByText('Message Text')).toBeInTheDocument();
    });

    test('render default', () => {
        const { getByText } = render(<PageError />);
        expect(getByText('Oops! Something went wrong')).toBeInTheDocument();
        expect(
            getByText('There was an issue on your request. Please try again later.')
        ).toBeInTheDocument();
    });
});
