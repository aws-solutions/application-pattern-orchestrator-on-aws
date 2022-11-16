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

import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QueryContainerTemplate from '.';

const data = {
    name: 'test_name',
};

describe('Query Container Template', () => {
    test('render loading', () => {
        const { getByRole } = render(
            <BrowserRouter>
                <QueryContainerTemplate loading={true}>
                    {() => {
                        return <h1>{data.name}</h1>;
                    }}
                </QueryContainerTemplate>
            </BrowserRouter>
        );
        expect(getByRole('progressbar')).toBeInTheDocument();
    });

    test('render error', () => {
        const { getByText, queryByRole } = render(
            <BrowserRouter>
                <QueryContainerTemplate loading={false} error={'test error'}>
                    {() => {
                        return <h1>{data.name}</h1>;
                    }}
                </QueryContainerTemplate>
            </BrowserRouter>
        );
        expect(getByText('Oops! Something went wrong')).toBeInTheDocument();
        expect(getByText('test error')).toBeInTheDocument();
        expect(queryByRole('progressbar')).toBeNull();
    });

    test('render children', () => {
        const { getByText, queryByRole } = render(
            <BrowserRouter>
                <QueryContainerTemplate loading={false} data={data}>
                    {() => {
                        return <h1>{data.name}</h1>;
                    }}
                </QueryContainerTemplate>
            </BrowserRouter>
        );
        expect(getByText(data.name)).toBeInTheDocument();
        expect(queryByRole('progressbar')).toBeNull();
    });

    test('render - returns null', () => {
        const { container } = render(
            <BrowserRouter>
                <QueryContainerTemplate loading={false} data={undefined}>
                    {() => {
                        return <h1>{data.name}</h1>;
                    }}
                </QueryContainerTemplate>
            </BrowserRouter>
        );
        expect(container).toBeEmptyDOMElement();
    });
});
