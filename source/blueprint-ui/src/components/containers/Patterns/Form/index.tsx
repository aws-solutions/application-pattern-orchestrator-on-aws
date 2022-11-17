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

import { componentTypes, FormRenderer, validatorTypes } from 'aws-northstar';
import Text from 'aws-northstar/components/Text';
import { FunctionComponent, useMemo, useRef } from 'react';
import {
    AttributeSummary,
    PatternType,
    KeyValuePairType,
    PatternFormData,
} from '../../../types';
import PatternReview from './components/Review';
import EnvConfig from '../../../../services/EnvConfig';
import { getDefaultPatternType } from '../../../../utils/helpers';

const customComponentMapping = {
    PLAIN_TEXT: Text,
};

export interface PatternFormProps {
    onSubmit: (data: PatternFormData) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    initialValues?: PatternFormData;
    attributes?: Record<string, AttributeSummary[]>;
    hidePatternType: boolean;
    isUpdate?: boolean;
}

interface PatternTypeOption {
    label: 'CloudFormation' | 'CDK';
    description: string;
    value: PatternType;
}

export function getPatternTypeOptions(): PatternTypeOption[] {
    const patternTypeOptions: PatternTypeOption[] = [];
    const patternType = EnvConfig.patternType.toUpperCase();

    if (patternType === 'CLOUDFORMATION' || patternType === 'ALL') {
        patternTypeOptions.push({
            label: 'CloudFormation',
            description:
                'CloudFormation Pattern are automatically added to a Service Catalog of IT services that are approved for use on AWS',
            value: 'CFN',
        });
    }

    if (patternType === 'CDK' || patternType === 'ALL') {
        patternTypeOptions.push({
            label: 'CDK',
            description:
                'CDK Pattern provide well-architected CDK constructs to solve specific problems',
            value: 'CDK',
        });
    }
    return patternTypeOptions;
}

const PatternForm: FunctionComponent<PatternFormProps> = ({
    onSubmit,
    onCancel,
    initialValues = {
        name: '',
        description: '',
        patternType: getDefaultPatternType(),
        attributes: [],
    },
    attributes = {},
    isSubmitting,
    hidePatternType,
    isUpdate = false,
}: PatternFormProps) => {
    const previousAttributeKeysRef = useRef(['']);

    // Application Details sub form
    const detailsSubForm = useMemo(() => {
        return {
            name: 'patternDetails',
            title: 'Pattern Details',
            fields: [
                {
                    component: componentTypes.TEXT_FIELD,
                    name: 'name',
                    label: 'Name',
                    isRequired: true,
                    isDisabled: isUpdate,
                    validate: [
                        {
                            type: validatorTypes.REQUIRED,
                        },
                        { type: validatorTypes.MAX_LENGTH, threshold: 40 },
                        {
                            type: validatorTypes.PATTERN,
                            pattern: /^[a-z0-9-_]+$/,
                        },
                    ],
                },
                // For single patternType hide the radio button
                {
                    component: componentTypes.RADIO,
                    name: 'patternType',
                    label: 'Pattern Type',
                    hideField: hidePatternType || isUpdate,
                    isRequired: true,
                    options: getPatternTypeOptions(),
                    validate: [
                        {
                            type: validatorTypes.REQUIRED,
                        },
                    ],
                },
                {
                    component: componentTypes.TEXTAREA,
                    name: 'description',
                    label: 'Description',
                    isRequired: false,
                    validate: [{ type: validatorTypes.MAX_LENGTH, threshold: 1024 }],
                },
                // For single patternType option or for Update patern - display as readonly text
                {
                    component: 'PLAIN_TEXT',
                    name: 'patternTypeLabel',
                    hideField: !hidePatternType,
                    children: `Pattern Type: ${initialValues.patternType}`,
                },
            ],
        };
    }, [isUpdate, hidePatternType, initialValues]);

    // Select attributes sub form
    const attributesSubForm = useMemo(() => {
        // Regex to get the index of the selected field in the field array
        const regexFieldArrayIndex = /\[(-?\d+)\]/;

        return {
            name: 'Attributes',
            title: 'Select Attribute',
            fields: [
                {
                    component: componentTypes.FIELD_ARRAY,
                    name: 'attributes',
                    maxItems: Object.keys(attributes).length,
                    fields: [
                        {
                            component: componentTypes.SELECT,
                            label: 'Attribute Key',
                            name: 'key',
                            dataType: 'string',
                            validate: [{ type: validatorTypes.REQUIRED }],
                            resolveProps: (
                                _props: unknown,
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                field: any,
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formOptions: any
                            ): unknown => {
                                const inputFieldName = field.input.name;
                                const currentIndex = parseInt(
                                    inputFieldName.match(regexFieldArrayIndex)[1]
                                );
                                const currentSelectedAttributeKey =
                                    formOptions.getState().values.attributes[currentIndex]
                                        .key;
                                // on attribute key change, clear the attribute value selection
                                if (
                                    previousAttributeKeysRef.current[currentIndex] &&
                                    previousAttributeKeysRef.current[currentIndex] !==
                                        currentSelectedAttributeKey
                                ) {
                                    formOptions.change(
                                        `attributes[${currentIndex}].value`,
                                        []
                                    );
                                }
                                previousAttributeKeysRef.current[currentIndex] =
                                    currentSelectedAttributeKey;
                                // currently selected attribute keys. Exclude the one which is currently in focus
                                const currentSelectedAttrKeys = formOptions
                                    .getState()
                                    .values.attributes.filter(
                                        (item: KeyValuePairType) =>
                                            item.key !== currentSelectedAttributeKey
                                    )
                                    .map((item: KeyValuePairType) => item.key);
                                return {
                                    options: Object.keys(attributes)
                                        .filter(
                                            (item) =>
                                                !currentSelectedAttrKeys.includes(item)
                                        )
                                        .sort((attr1, attr2) => {
                                            if (attr1 > attr2) {
                                                return 1;
                                            }
                                            if (attr2 > attr1) {
                                                return -1;
                                            }
                                            return 0;
                                        })
                                        .map((item) => ({
                                            label: item,
                                            value: item,
                                        })),
                                };
                            },
                        },
                        {
                            component: componentTypes.SELECT,
                            label: 'Attribute Value',
                            name: 'value',
                            dataType: 'string',
                            validate: [{ type: validatorTypes.REQUIRED }],
                            resolveProps: (
                                _props: unknown,
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                field: any,
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formOptions: any
                            ): unknown => {
                                const inputFieldName = field.input.name;
                                const currentIndex = parseInt(
                                    inputFieldName.match(regexFieldArrayIndex)[1]
                                );
                                const attr =
                                    formOptions.getState().values.attributes[
                                        currentIndex
                                    ];
                                return {
                                    options: attr.key
                                        ? attributes[attr.key].map((item) => ({
                                              label: item.value,
                                              value: item.value,
                                          }))
                                        : undefined,
                                };
                            },
                        },
                    ],
                },
            ],
        };
    }, [attributes]);

    // Review page
    const schema = useMemo(() => {
        return {
            header: isUpdate ? 'Update Pattern' : 'Create Pattern',
            fields: [
                {
                    component: componentTypes.WIZARD,
                    name: 'CreatePatternWizard',
                    fields: [
                        detailsSubForm,
                        attributesSubForm,
                        {
                            name: 'review',
                            title: 'Review',
                            fields: [
                                {
                                    component: componentTypes.REVIEW,
                                    name: 'review',
                                    Template: PatternReview,
                                },
                            ],
                        },
                    ],
                },
            ],
        };
    }, [isUpdate, attributesSubForm, detailsSubForm]);

    return (
        <FormRenderer
            schema={schema}
            onSubmit={onSubmit}
            onCancel={onCancel}
            initialValues={initialValues}
            isSubmitting={isSubmitting}
            customComponentWrapper={customComponentMapping}
        />
    );
};

export default PatternForm;
