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
import Stack from 'aws-northstar/layouts/Stack';
import KeyValuePair from 'aws-northstar/components/KeyValuePair';
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout';
import Table, { Column as TableColumn } from 'aws-northstar/components/Table';
import Text from 'aws-northstar/components/Text';
import { AttributeFormData, KeyValuePairType } from '../../../../../types';

const AttributeReview: FunctionComponent<{ data: AttributeFormData }> = ({ data }) => {
    const columnDefinitions: TableColumn<KeyValuePairType>[] = [
        {
            id: 'key',
            width: 300,
            Header: 'Key',
            accessor: 'key',
        },
        {
            id: 'value',
            width: 300,
            Header: 'Value',
            accessor: 'value',
        },
    ];
    return (
        <Stack>
            <ColumnLayout renderDivider={true}>
                <Column>
                    <Stack>
                        <KeyValuePair label="Key" value={data.key} />
                        <KeyValuePair label="Value" value={data.value} />
                        <KeyValuePair label="Description" value={data.description} />
                    </Stack>
                </Column>
                <Column>
                    <Text>Metadata</Text>
                    <Table
                        columnDefinitions={columnDefinitions}
                        items={data.metadata}
                        wrapText={false}
                        disableGroupBy={true}
                        disableSettings={true}
                        disablePagination={true}
                        disableFilters={true}
                        disableRowSelect={true}
                        disableSortBy={true}
                    />
                </Column>
            </ColumnLayout>
        </Stack>
    );
};

export default AttributeReview;
