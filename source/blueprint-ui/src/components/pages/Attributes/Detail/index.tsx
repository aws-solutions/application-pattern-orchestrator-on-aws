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

import Button from 'aws-northstar/components/Button';
import HeadingStripe from 'aws-northstar/components/HeadingStripe';
import { useAppLayoutContext } from 'aws-northstar/layouts/AppLayout';
import Inline from 'aws-northstar/layouts/Inline';
import Stack from 'aws-northstar/layouts/Stack';
import { FunctionComponent, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { generatePath, useHistory, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import AttributeDeleteConfirmationModal from '../../../containers/Attributes/DeleteConfirmationModal';
import AttributeDetailComponent from '../../../containers/Attributes/Detail';
import MetadataTable from '../../../containers/Attributes/Table/MetaData';
import QueryContainerTemplate from '../../../core/QueryContainerTemplate';
import GetAttributeDetailsQuery from '../../../queries/GetAttributeDetailsQuery';
import { deleteAttribute } from '../../../queries/Mutation';
import { ROUTE_ATTRIBUTES_VIEW, ROUTE_ATTRIBUTE_UPDATE } from '../../../routes';
import { DeleteAttributeParams } from '../../../types';

const AttributeDetail: FunctionComponent = () => {
    const appLayout = useAppLayoutContext();
    const history = useHistory();

    const { attributeId } = useParams<{ attributeId: string }>();
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

    // get attribute details
    const {
        isLoading,
        isError,
        data: attribute,
        error,
    } = useQuery('getAttributeDetails', () => GetAttributeDetailsQuery(attributeId), {
        retry: 3,
    });

    const mutation = useMutation(deleteAttribute, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (_data: any, _input: DeleteAttributeParams) => {
            history.replace(ROUTE_ATTRIBUTES_VIEW, {
                notifications: [
                    {
                        id: uuidv4(),
                        type: 'success',
                        header: `Delete Attribute ${attribute?.name} Succeeded.`,
                        dismissible: true,
                    },
                ],
            });
        },
        onError: (err: Error, _input: DeleteAttributeParams) => {
            appLayout.addNotification({
                id: uuidv4(),
                type: 'error',
                header: `Delete Attribute ${attribute?.name} Failed.`,
                content: err.message,
                dismissible: true,
            });
        },
    });

    const onConfirmDelete = () => {
        console.log(`confirm delete ${attribute?.name}`);
        if (attribute) {
            mutation.mutate({ name: attribute.name });
        }
    };

    const ActionButtons = useMemo(() => {
        const path = generatePath(ROUTE_ATTRIBUTE_UPDATE, {
            attributeId: attributeId,
        });

        return (
            <Inline>
                <Button
                    onClick={() => {
                        setShowDeleteConfirmation(true);
                    }}
                >
                    Delete
                </Button>
                <Button
                    onClick={() => {
                        history.push(path);
                    }}
                >
                    Edit
                </Button>
            </Inline>
        );
    }, [attributeId, history]);

    return (
        <QueryContainerTemplate
            loading={isLoading}
            error={isError && error ? (error as string) : undefined}
            data={attribute}
        >
            {(attr) => (
                <Stack>
                    <HeadingStripe
                        title={
                            attr.name.length >= 60
                                ? attr.name.substring(0, 60) + '...'
                                : attr.name
                        }
                        actionButtons={ActionButtons}
                    />
                    <AttributeDetailComponent attribute={attr} />
                    <MetadataTable
                        metadata={attr.metadata}
                        disableCreate={true}
                        disableRowSelect={true}
                        disableToolbar={true}
                        disableDelete={true}
                    />
                    <AttributeDeleteConfirmationModal
                        attributeName={attr.name}
                        visible={showDeleteConfirmation}
                        setVisible={setShowDeleteConfirmation}
                        onConfirmed={onConfirmDelete}
                    />
                </Stack>
            )}
        </QueryContainerTemplate>
    );
};

export default AttributeDetail;
