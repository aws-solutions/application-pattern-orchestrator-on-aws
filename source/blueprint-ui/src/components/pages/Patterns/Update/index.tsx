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
import { generatePath, useHistory, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import PatternForm from '../../../containers/Patterns/Form';
import PageError from '../../../core/PageError';
import PageLoading from '../../../core/PageLoading';
import getAllAttributesQuery from '../../../queries/GetAllAttributesQuery';
import getPatternDetailsQuery from '../../../queries/GetPatternDetailsQuery';
import { updatePatternMetaData } from '../../../queries/Mutation';
import { ROUTE_BLUEPRINT_DETAIL } from '../../../routes';
import { KeyValuePairType, Pattern, UpdatePatternRequestProps } from '../../../types';
import { PatternFormData } from '../../../types/index';

const PatternUpdate: FunctionComponent = () => {
    const history = useHistory();
    const appLayout = useAppLayoutContext();
    const { blueprintId } = useParams<{ blueprintId: string }>();
    const [input, setInput] = useState<PatternFormData>();

    const [isSubmitting, setIsSubmitting] = useState(false);

    // get pattern details
    const {
        isLoading: isLoadingPattern,
        isError: isErrorPattern,
        data: pattern,
        error: errorPattern,
    } = useQuery('getPatternDetails', () => getPatternDetailsQuery(blueprintId), {
        retry: 3,
    });

    // load attributes
    const {
        isLoading: isLoadingAttributes,
        isError: isErrorAttributes,
        data: attributes,
        error: errorAttributes,
    } = useQuery('listAttributes', getAllAttributesQuery, {
        retry: 3,
    });

    const mutation = useMutation(updatePatternMetaData, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (_data: any, props: UpdatePatternRequestProps) => {
            setIsSubmitting(false);
            const path = generatePath(ROUTE_BLUEPRINT_DETAIL, {
                blueprintId: props.patternId,
            });
            appLayout.addNotification({
                header: `Successfully updated the pattern ${props.patternId}`,
                id: uuid(),
                type: 'success',
                dismissible: true,
            });
            history.push(path);
        },
        onError: (error: Error, props: UpdatePatternRequestProps) => {
            setIsSubmitting(false);
            appLayout.addNotification({
                header: `Failed to update the pattern ${props.patternId}`,
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

    const handleSubmit = async (patternFormData: PatternFormData) => {
        setIsSubmitting(true);
        setInput(patternFormData);
        const updatePatternPayload: UpdatePatternRequestProps = {
            patternId: blueprintId,
            description: patternFormData.description ? patternFormData.description : '',
            attributes: patternFormData.attributes
                ? Object.fromEntries(
                      patternFormData.attributes.map((attribute: KeyValuePairType) => [
                          attribute.key,
                          attribute.value,
                      ])
                  )
                : {},
        };
        mutation.mutate(updatePatternPayload);
    };

    if (isErrorAttributes) {
        return (
            <PageError
                header="Error occured when loading Attributes"
                message={errorAttributes ? (errorAttributes as string) : undefined}
            />
        );
    }

    if (isLoadingAttributes || isLoadingPattern || mutation.isLoading) {
        return <PageLoading />;
    }

    if (isErrorPattern) {
        return (
            <PageError
                header="Error occured when loading pattern details"
                message={errorPattern ? (errorPattern as string) : undefined}
            />
        );
    }
    const transformToDisplayData = (
        pattern: Pattern,
        inputFormData?: PatternFormData
    ): PatternFormData => {
        if (inputFormData) {
            return inputFormData;
        } else {
            const patternMetaData = pattern.metadata;
            return {
                name: patternMetaData.name,
                description: patternMetaData.description,
                patternType: patternMetaData.patternType,
                attributes: patternMetaData.attributes
                    ? Object.entries(patternMetaData.attributes)
                          .map(([key, value]) => ({
                              name: `${key}:${value}`,
                              key,
                              value,
                          }))
                          .sort((attr1, attr2) => {
                              if (attr1.key > attr2.key) {
                                  return 1;
                              }
                              if (attr1.key < attr2.key) {
                                  return -1;
                              }
                              return 0;
                          })
                    : undefined,
            };
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const initialValues = transformToDisplayData(pattern!, input);

    return (
        <PatternForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialValues={initialValues}
            attributes={attributeMap}
            isSubmitting={isSubmitting}
            hidePatternType={true}
            isUpdate={true}
        />
    );
};

export default PatternUpdate;
