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

import { FunctionComponent } from 'react';
import Container from 'aws-northstar/layouts/Container';
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout';
import Stack from 'aws-northstar/layouts/Stack';
import KeyValuePair from 'aws-northstar/components/KeyValuePair';
import { formatDate } from '../../../../utils/helpers';
import { AttributeDetailProps } from '../../../types';

const AttributeDetail: FunctionComponent<AttributeDetailProps> = ({ attribute }) => {
    return (
        <Stack>
            <Container title="General Information">
                <ColumnLayout renderDivider={true}>
                    <Column>
                        <Stack>
                            <KeyValuePair label="Key" value={attribute?.key} />
                            <KeyValuePair label="Value" value={attribute?.value} />
                            <KeyValuePair
                                label="Description"
                                value={attribute?.description}
                            />
                        </Stack>
                    </Column>
                    <Column>
                        <Stack>
                            <KeyValuePair
                                label="Created At"
                                value={
                                    attribute?.createTime &&
                                    formatDate(new Date(attribute.createTime))
                                }
                            />
                            <KeyValuePair
                                label="Last Updated At"
                                value={
                                    attribute?.lastUpdateTime &&
                                    formatDate(new Date(attribute.lastUpdateTime))
                                }
                            />
                        </Stack>
                    </Column>
                </ColumnLayout>
            </Container>
        </Stack>
    );
};

export default AttributeDetail;
