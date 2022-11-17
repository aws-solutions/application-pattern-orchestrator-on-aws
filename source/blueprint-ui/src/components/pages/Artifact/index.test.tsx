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
import { BrowserRouter } from 'react-router-dom';
import BlueprintArtifactComponent, { BlueprintArtifactComponentProps } from '.';

const imageArtifact: BlueprintArtifactComponentProps = {
    artifact: {
        location: './images/architecture.png',
        type: 'IMAGE',
        name: 'architecture.png',
    },
    artifactData: 'test image data',
};

const markdownArtifact: BlueprintArtifactComponentProps = {
    artifact: {
        location: './USAGE.md',
        type: 'MARKDOWN',
        name: 'USAGE.md',
    },
    artifactData: 'dGVzdCBtYXJrZG93bgo=',
};

const controlArtifact: BlueprintArtifactComponentProps = {
    artifact: {
        location: './CONTROL',
        type: 'CONTROL',
        name: 'control.abc',
    },
    artifactData: 'test control data',
};

describe('Artifact test', () => {
    test('test image artifact', () => {
        const { getByAltText } = render(
            <BrowserRouter>
                <BlueprintArtifactComponent
                    artifact={imageArtifact.artifact}
                    artifactData={imageArtifact.artifactData}
                />
            </BrowserRouter>
        );
        expect(getByAltText('architecture.png')).toBeInTheDocument();
    });

    test('test markdown artifact', () => {
        const { getByText } = render(
            <BrowserRouter>
                <BlueprintArtifactComponent
                    artifact={markdownArtifact.artifact}
                    artifactData={markdownArtifact.artifactData}
                />
            </BrowserRouter>
        );
        expect(getByText('test markdown')).toBeInTheDocument();
    });

    test('test control artifact', () => {
        const { getByText } = render(
            <BrowserRouter>
                <BlueprintArtifactComponent
                    artifact={controlArtifact.artifact}
                    artifactData={controlArtifact.artifactData}
                />
            </BrowserRouter>
        );
        expect(getByText(/Cannot render artifacts of type/i)).toBeInTheDocument();
    });
});
