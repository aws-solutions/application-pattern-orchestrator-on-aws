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
import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BlueprintArtifactContainer from '.';
import { PatternArtifact } from '../../types';
import GetArtifactDetails from '../../queries/GetArtifactDetailsQuery';

jest.mock('../../queries/GetArtifactDetailsQuery');
const mockGetArtifactDetails = GetArtifactDetails as jest.Mock;

const artifact: PatternArtifact = {
    location: './README.md',
    type: 'MARKDOWN',
    name: 'README',
};

describe('BlueprintArtifactContainer', () => {
    test('render', async () => {
        mockGetArtifactDetails.mockResolvedValue('dGVzdCB1c2FnZSBkb2N1bWVudAo=');

        await act(async () => {
            render(
                <BrowserRouter>
                    <BlueprintArtifactContainer artifact={artifact} />
                </BrowserRouter>
            );
        });

        expect(mockGetArtifactDetails).toBeCalled();
        expect(screen.getByText('test usage document')).toBeInTheDocument();
    });
});
