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

import { FunctionComponent, useState, useEffect } from 'react';
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout';
import Container from 'aws-northstar/layouts/Container';
import { PatternArtifact, PatternPublishData } from '../../types';
import BlueprintArtifactContainer from '../BlueprintArtifact';

export interface BlueprintVersionContainerProps {
    blueprintVersion?: PatternPublishData;
}

const BlueprintVersionContainer: FunctionComponent<BlueprintVersionContainerProps> = ({
    blueprintVersion,
}) => {
    const [usageArtifact, setUsageArtifact] = useState<PatternArtifact>();
    const [architectureArtifact, setArchitectureArtifact] = useState<PatternArtifact>();

    useEffect(() => {
        if (blueprintVersion) {
            setUsageArtifact(
                blueprintVersion.artifacts.find(
                    (artifact) => artifact.name === 'USAGE.md'
                )
            );

            setArchitectureArtifact(
                blueprintVersion.artifacts.find(
                    (artifact) => artifact.name === 'architecture.png'
                )
            );
        }
    }, [architectureArtifact, blueprintVersion, usageArtifact]);

    return (
        <ColumnLayout renderDivider={true}>
            <Column>
                <Container
                    title="Usage"
                    style={{
                        width: '100%',
                        maxHeight: '800px',
                        overflow: 'scroll',
                    }}
                >
                    {usageArtifact ? (
                        <BlueprintArtifactContainer artifact={usageArtifact} />
                    ) : (
                        <span>Usage Not Found</span>
                    )}
                </Container>
            </Column>
            <Column>
                <Container
                    title="Architecture"
                    style={{
                        width: '100%',
                        maxHeight: '800px',
                        overflow: 'scroll',
                        textAlign: 'center',
                    }}
                >
                    {architectureArtifact ? (
                        <BlueprintArtifactContainer artifact={architectureArtifact} />
                    ) : (
                        <span>Architecture Diagram Not Found</span>
                    )}
                </Container>
            </Column>
        </ColumnLayout>
    );
};

export default BlueprintVersionContainer;
