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

import { useAppLayoutContext } from 'aws-northstar/layouts/AppLayout';
import React, { FunctionComponent, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { generatePath, useHistory } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { getDefaultPatternType } from '../../../../utils/helpers';
import PatternForm, { getPatternTypeOptions } from '../../../containers/Patterns/Form';
import PageError from '../../../core/PageError';
import PageLoading from '../../../core/PageLoading';
import GetAllAttributesQuery from '../../../queries/GetAllAttributesQuery';
import { createPattern } from '../../../queries/Mutation';
import { ROUTE_BLUEPRINT_DETAIL } from '../../../routes';
import {
    CreatePatternParams,
    CreatePatternRequestProps,
    KeyValuePairType,
} from '../../../types';
import { PatternFormData } from '../../../types/index';

const defaultValue: CreatePatternParams = {
    name: '',
    description: '',
    patternType: getDefaultPatternType(),
};

const PatternCreate: FunctionComponent = () => {
    const history = useHistory();
    const appLayout = useAppLayoutContext();
    const [input, setInput] = useState<CreatePatternParams>(defaultValue);

    const initialValues = input;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const hidePatternType = getPatternTypeOptions().length === 1;

    // load attributes
    const {
        isLoading: isLoadingAttributes,
        isError: isErrorAttributes,
        data: attributes,
        error: errorAttributes,
    } = useQuery('listAttributes', GetAllAttributesQuery, {
        retry: 3,
    });

    const mutation = useMutation(createPattern, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (_data: any, props: CreatePatternRequestProps) => {
            setIsSubmitting(false);
            const path = generatePath(ROUTE_BLUEPRINT_DETAIL, {
                blueprintId: props.name,
            });
            appLayout.addNotification({
                header: `Successfully created the pattern ${props.name}`,
                id: uuid(),
                type: 'success',
                dismissible: true,
            });
            history.push(path);
        },
        onError: (error: Error, props: CreatePatternRequestProps) => {
            setIsSubmitting(false);
            appLayout.addNotification({
                header: `Failed to create the pattern ${props.name}`,
                id: uuid(),
                type: 'error',
                dismissible: true,
                content: error.message,
            });
        },
    });

    const attributeMap = useMemo(() => {
        if (attributes?.results) {
            const attributeKeys = Array.from(
                new Set(attributes.results.map((item) => item.key))
            );
            return Object.fromEntries(
                attributeKeys.map((item) => [
                    item,
                    attributes.results.filter((attr) => item === attr.key),
                ])
            );
        } else {
            return undefined;
        }
    }, [attributes]);

    const handleCancel = () => {
        history.goBack();
    };

    const handleSubmit = async (createPatternFormData: PatternFormData) => {
        setIsSubmitting(true);
        setInput(createPatternFormData);
        const createPatternPayload: CreatePatternRequestProps = {
            ...createPatternFormData,
            attributes: createPatternFormData.attributes
                ? Object.fromEntries(
                      createPatternFormData.attributes.map(
                          (attribute: KeyValuePairType) => [
                              attribute.key,
                              attribute.value,
                          ]
                      )
                  )
                : undefined,
        };
        mutation.mutate(createPatternPayload);
    };

    if (isErrorAttributes) {
        return (
            <PageError
                header="Error occurs when loading Attributes"
                message={errorAttributes ? (errorAttributes as string) : undefined}
            />
        );
    }

    if (isLoadingAttributes || mutation.isLoading) {
        return <PageLoading />;
    }
    return (
        <PatternForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialValues={initialValues}
            attributes={attributeMap}
            isSubmitting={isSubmitting}
            hidePatternType={hidePatternType}
        />
    );
};

export default PatternCreate;
