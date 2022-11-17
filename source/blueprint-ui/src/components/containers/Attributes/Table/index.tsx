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

import { FunctionComponent, useMemo, useState, useCallback } from 'react';
import { generatePath, useHistory } from 'react-router-dom';
import Table, { Column } from 'aws-northstar/components/Table';
import Link from 'aws-northstar/components/Link';
import Button from 'aws-northstar/components/Button';
import Inline from 'aws-northstar/layouts/Inline';
import { formatDate } from '../../../../utils/helpers';
import { ROUTE_ATTRIBUTE_CREATE, ROUTE_ATTRIBUTE_UPDATE } from '../../../routes';
import { AttributeSummary } from '../../../types';

export interface AttributeTableProps {
    attributes?: AttributeSummary[];
    disableRowSelect?: boolean;
    disableToolbar?: boolean;
    disableCreate?: boolean;
    disableDelete?: boolean;
    showCreateTime?: boolean;
    tableName?: string;
    onDeleteAttribute: (selectedAttributes: AttributeSummary[]) => void;
}

export const getColumnDefinitions = (showCreateTime: boolean) => {
    const fields: Column<AttributeSummary>[] = [
        {
            id: 'key',
            width: 200,
            Header: 'Key',
            accessor: 'key',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Cell: ({ row }: any) => {
                return (
                    <Link href={`/attributes/${row.original.name}`}>
                        {row.original.key}
                    </Link>
                );
            },
        },
        {
            id: 'value',
            width: 200,
            Header: 'Value',
            accessor: 'value',
        },
    ];
    if (showCreateTime) {
        fields.push({
            id: 'createTime',
            width: 500,
            Header: 'Create Time',
            accessor: 'createTime',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Cell: ({ row }: any) => (
                <Inline>{formatDate(new Date(row.original.createTime))}</Inline>
            ),
        });
    }

    return fields;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
const AttributeTable: FunctionComponent<AttributeTableProps> = ({
    attributes = [],
    disableRowSelect = false,
    disableToolbar = false,
    disableCreate = false,
    disableDelete = false,
    showCreateTime = true,
    tableName,
    onDeleteAttribute,
}: AttributeTableProps) => {
    const history = useHistory();
    const [selectedAttributes, setSelectedAttributes] = useState<AttributeSummary[]>([]);
    const columnDefinitions = useMemo(
        () => getColumnDefinitions(showCreateTime),
        [showCreateTime]
    );

    const attributeTableActions = useMemo(() => {
        const pathUpdate = selectedAttributes[0]?.name
            ? generatePath(ROUTE_ATTRIBUTE_UPDATE, {
                  attributeId: selectedAttributes[0].name,
              })
            : '';

        return (
            <Inline>
                {!disableRowSelect && (
                    <Button
                        disabled={selectedAttributes.length !== 1}
                        onClick={() => {
                            history.push(pathUpdate);
                        }}
                    >
                        Update
                    </Button>
                )}
                {!disableRowSelect && !disableDelete && (
                    <Button
                        disabled={selectedAttributes.length !== 1}
                        onClick={() => {
                            onDeleteAttribute(selectedAttributes);
                        }}
                    >
                        Delete
                    </Button>
                )}
                {!disableCreate && (
                    <Button
                        variant="primary"
                        onClick={() => {
                            history.push(ROUTE_ATTRIBUTE_CREATE);
                        }}
                    >
                        Add new Attribute
                    </Button>
                )}
            </Inline>
        );
    }, [
        selectedAttributes,
        disableRowSelect,
        disableDelete,
        disableCreate,
        history,
        onDeleteAttribute,
    ]);

    const getRowId = useCallback((data) => data.name, []);
    return (
        <Table
            columnDefinitions={columnDefinitions}
            tableTitle={tableName || `Attributes (${attributes.length})`}
            disableRowSelect={disableRowSelect}
            multiSelect={false}
            actionGroup={attributeTableActions}
            onSelectionChange={setSelectedAttributes}
            getRowId={getRowId}
            items={attributes}
            wrapText={false}
            disableSettings={disableToolbar}
            disableFilters={disableToolbar}
            disablePagination={disableToolbar}
            sortBy={[{ id: 'createTime', desc: true }]}
        />
    );
};

export default AttributeTable;
