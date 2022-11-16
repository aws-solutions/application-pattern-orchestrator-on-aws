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
import { generatePath, useHistory, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import { useAppLayoutContext } from 'aws-northstar/layouts/AppLayout';
import {
    AttributeFormData,
    AttributeFormDataWithName,
    KeyValuePairType,
    UpdateAttributeParams,
    UpdateAttributeResponse,
} from '../../../types';
import PageError from '../../../core/PageError';
import PageLoading from '../../../core/PageLoading';
import { useMutation, useQuery } from 'react-query';
import AttributeForm from '../../../containers/Attributes/Form';
import GetAttributeDetailsQuery from '../../../queries/GetAttributeDetailsQuery';
import { updateAttribute } from '../../../queries/Mutation';
import { ROUTE_ATTRIBUTE_DETAILS } from '../../../routes';

const AttributeUpdate: FunctionComponent = () => {
    const history = useHistory();
    const { attributeId } = useParams<{ attributeId: string }>();
    const appLayout = useAppLayoutContext();

    // get attribute details
    const {
        isLoading,
        isError,
        data: attribute,
        error,
    } = useQuery('getAttributeDetails', () => GetAttributeDetailsQuery(attributeId), {
        retry: 3,
    });

    const [input, setInput] = useState<UpdateAttributeParams>();

    const mutation = useMutation(updateAttribute, {
        onSuccess: (data: UpdateAttributeResponse) => {
            const path = generatePath(ROUTE_ATTRIBUTE_DETAILS, {
                attributeId: data.name,
            });

            history.replace(path, {
                notifications: [
                    {
                        id: uuidv4(),
                        type: 'success',
                        header: `Update Attribute ${data.name} Succeeded.`,
                        dismissible: true,
                    },
                ],
            });
        },
        onError: (err: Error, params: UpdateAttributeParams) => {
            appLayout.addNotification({
                id: uuidv4(),
                type: 'error',
                header: `Update Attribute ${params.name} Failed.`,
                content: err.message,
                dismissible: true,
            });
        },
    });

    const handleCancel = () => {
        history.goBack();
    };

    const handleSubmit = (values: AttributeFormDataWithName) => {
        const request = {
            name: values.name,
            key: values.key,
            value: values.value,
            description: values.description,
            metadata: values.metadata.reduce(
                (currentObj: Record<string, string>, previousObj: KeyValuePairType) => ({
                    ...currentObj,
                    [previousObj.key]: previousObj.value,
                }),
                {}
            ),
        };
        setInput(request);
        handleUpdateApplication(request);
    };

    const handleUpdateApplication = (request: UpdateAttributeParams) => {
        mutation.mutate(request);
    };

    // page
    if (isError || !attribute) {
        return (
            <PageError
                header="Error occurs when loading Attribute"
                message={error ? (error as string) : undefined}
            />
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (isLoading || mutation.isLoading) {
        return <PageLoading />;
    }

    const transformToDisplayData = (data: UpdateAttributeParams): AttributeFormData => {
        return {
            ...data,
            metadata: Object.keys(data.metadata).map((key) => ({
                key: key,
                value: data.metadata[key],
            })),
        };
    };

    const initialValues = transformToDisplayData(input ?? attribute);
    return (
        <AttributeForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialValues={initialValues}
            isUpdate={true}
        />
    );
};

export default AttributeUpdate;
