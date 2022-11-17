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
import { FunctionComponent, ReactElement } from 'react';
import MarkdownViewer from 'aws-northstar/components/MarkdownViewer';
import { PatternArtifact } from '../../types';
import { Buffer } from 'buffer';

export interface BlueprintArtifactComponentProps {
    artifact: PatternArtifact;
    artifactData: string;
}

const BlueprintArtifactComponent: FunctionComponent<BlueprintArtifactComponentProps> = ({
    artifact,
    artifactData,
}) => {
    if (!artifactData) {
        return <span />;
    }

    let component: ReactElement;
    if (artifact.type === 'MARKDOWN') {
        component = (
            // Markdown content is returned base64 encoded by the artifacts API
            <MarkdownViewer>
                {Buffer.from(artifactData, 'base64').toString()}
            </MarkdownViewer>
        );
    } else if (artifact.type === 'IMAGE') {
        component = (
            // Blueprint service only supports png files
            <img
                alt={artifact.name}
                src={`data:image/png;base64, ${artifactData}`}
                style={{
                    width: '100%',
                }}
            />
        );
    } else {
        component = <span>Cannot render artifacts of type {artifact.type}</span>;
    }

    return component;
};

export default BlueprintArtifactComponent;
