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
import { when } from 'jest-when';

import { BrowserRouter } from 'react-router-dom';
import BlueprintVersionContainer from '.';
import { PatternPublishData } from '../../types';
import GetArtifactDetails from '../../queries/GetArtifactDetailsQuery';

jest.mock('../../queries/GetArtifactDetailsQuery');
const mockGetArtifactDetails = GetArtifactDetails as jest.Mock;

const blueprintVersion: PatternPublishData = {
    allPackages: [
        {
            name: '@demo-cdk/compliant-dynamodbtable',
            version: '1.1.0',
        },
        {
            name: '@demo-cdk/compliant-s3-bucket',
            version: '1.1.0',
        },
    ],
    updatedTimestamp: '2022-07-17T12:46:54.954Z',
    changedPackages: [
        {
            name: '@demo-cdk/compliant-dynamodbtable',
            version: '1.1.0',
        },
        {
            name: '@demo-cdk/compliant-s3-bucket',
            version: '1.1.0',
        },
    ],
    codeArtifactDetails: {
        codeArtifactRepositoryName: 'awspatterns',
        region: 'ap-southeast-2',
        codeArtifactDomainName: 'awspatterns',
        account: '666666666',
    },
    patternId: 'demo-cdk',
    artifacts: [
        {
            type: 'CONTROL',
            name: 'cfn_nag.txt',
            location:
                'demo-cdk/a826df2cff836d4feda834a7b4f5cc6f1fdf7427/controls/cfn_nag.txt',
        },
        {
            type: 'IMAGE',
            name: 'architecture.png',
            location:
                'demo-cdk/a826df2cff836d4feda834a7b4f5cc6f1fdf7427/images/architecture.png',
        },
        {
            type: 'MARKDOWN',
            name: 'README.md',
            location:
                'demo-cdk/a826df2cff836d4feda834a7b4f5cc6f1fdf7427/markdown/README.md',
        },
        {
            type: 'MARKDOWN',
            name: 'USAGE.md',
            location:
                'demo-cdk/a826df2cff836d4feda834a7b4f5cc6f1fdf7427/markdown/USAGE.md',
        },
    ],
    createdTimestamp: '2022-07-17T12:46:54.954Z',
    commitId: 'a826df2cff836d4feda834a7b4f5cc6f1fdf7427',
    commitMessage: 'Test commit',
};

describe('BlueprintVersionContainer', () => {
    test('render', async () => {
        when(mockGetArtifactDetails)
            .calledWith(
                'demo-cdk/a826df2cff836d4feda834a7b4f5cc6f1fdf7427/markdown/USAGE.md'
            )
            .mockResolvedValue('dGVzdCB1c2FnZSBkb2N1bWVudAo=');
        when(mockGetArtifactDetails)
            .calledWith(
                'demo-cdk/a826df2cff836d4feda834a7b4f5cc6f1fdf7427/images/architecture.png'
            )
            .mockResolvedValue('xxxyyyzzz');

        await act(async () => {
            render(
                <BrowserRouter>
                    <BlueprintVersionContainer blueprintVersion={blueprintVersion} />
                </BrowserRouter>
            );
        });
        expect(screen.getByText('test usage document')).toBeInTheDocument();
        expect(screen.getByAltText('architecture.png')).toBeInTheDocument();
    });
});
