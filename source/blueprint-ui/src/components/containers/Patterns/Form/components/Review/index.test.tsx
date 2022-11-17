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

import { render, screen } from '@testing-library/react';
import PatternReview from './index';
import { PatternFormData } from '../../../../../types';

describe('Patterns Form', () => {
    test('render without attributes', () => {
        const patternFormData: PatternFormData = {
            name: 'Test Form',
            description: 'Test form description xxx',
            patternType: 'CDK',
        };
        render(<PatternReview data={patternFormData} />);

        expect(screen.getByText('Test Form')).toBeInTheDocument();
        expect(screen.getByText('CDK')).toBeInTheDocument();
        expect(screen.getByText('Test form description xxx')).toBeInTheDocument();
        expect(screen.getByText('No records found')).toBeInTheDocument();
    });

    test('render with attributes', () => {
        const patternFormData: PatternFormData = {
            name: 'Test Form',
            description: 'Test form description xxx',
            patternType: 'CFN',
            attributes: [
                {
                    key: 'attribute_1',
                    value: 'attribute_value_1',
                },
                {
                    key: 'attribute_2',
                    value: 'attribute_value_2',
                },
            ],
        };
        render(<PatternReview data={patternFormData} />);

        expect(screen.getByText('Test Form')).toBeInTheDocument();
        expect(screen.getByText('CFN')).toBeInTheDocument();
        expect(screen.getByText('attribute_1')).toBeInTheDocument();
        expect(screen.getByText('attribute_value_1')).toBeInTheDocument();
        expect(screen.getByText('attribute_2')).toBeInTheDocument();
        expect(screen.getByText('attribute_value_2')).toBeInTheDocument();
    });
});
