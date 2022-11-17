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

import { FunctionComponent, useState } from 'react';
import QueryContainerTemplate from '../../../core/QueryContainerTemplate';
import AttributesTable from '../../../containers/Attributes/Table';
import { Stack } from 'aws-northstar';
import { v4 as uuid } from 'uuid';
import { useQuery, useMutation } from 'react-query';
import AttributeDeleteConfirmationModal from '../../../containers/Attributes/DeleteConfirmationModal';
import { AttributeSummary, DeleteAttributeParams } from '../../../types';
import GetAllAttributesQuery from '../../../queries/GetAllAttributesQuery';
import { useAppLayoutContext } from 'aws-northstar/layouts/AppLayout';
import { deleteAttribute } from '../../../queries/Mutation';

const AttributesContainer: FunctionComponent = () => {
    const appLayout = useAppLayoutContext();
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [attributeToBeDeleted, setAttributeToBeDeleted] = useState<AttributeSummary>();

    // load attributes
    const { isLoading, isError, data, error } = useQuery(
        'listAttributes',
        GetAllAttributesQuery,
        {
            retry: 3,
        }
    );

    const mutation = useMutation(deleteAttribute, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (_data: any, _input: DeleteAttributeParams) => {
            setIsDeleting(false);
            setShowDeleteConfirmation(false);
            appLayout.addNotification({
                id: uuid(),
                type: 'success',
                header: `Delete Attribute ${attributeToBeDeleted?.name} Succeeded.`,
                dismissible: true,
            });
            setAttributeToBeDeleted(undefined);
        },
        onError: (err: Error, _input: DeleteAttributeParams) => {
            setIsDeleting(false);
            setShowDeleteConfirmation(false);
            appLayout.addNotification({
                header: `Delete Attribute ${attributeToBeDeleted?.name} Failed.`,
                id: uuid(),
                type: 'error',
                dismissible: true,
                content: err.message,
            });
        },
    });

    const onDelete = (selectedAttributes: AttributeSummary[]) => {
        setAttributeToBeDeleted(selectedAttributes[0]);
        setShowDeleteConfirmation(true);
    };

    const onConfirmDelete = () => {
        if (attributeToBeDeleted) {
            setIsDeleting(true);
            mutation.mutate({ name: attributeToBeDeleted.name });
        }
    };

    return (
        <QueryContainerTemplate
            loading={isLoading}
            error={isError && error ? (error as string) : undefined}
            data={data}
        >
            {(attributeData) => {
                return (
                    <Stack>
                        <AttributesTable
                            attributes={attributeData.results}
                            disableRowSelect={false}
                            onDeleteAttribute={onDelete}
                        />
                        <AttributeDeleteConfirmationModal
                            attributeName={attributeToBeDeleted?.name ?? ''}
                            visible={showDeleteConfirmation}
                            setVisible={setShowDeleteConfirmation}
                            onConfirmed={onConfirmDelete}
                            isDeleting={isDeleting}
                        />
                    </Stack>
                );
            }}
        </QueryContainerTemplate>
    );
};

export default AttributesContainer;
