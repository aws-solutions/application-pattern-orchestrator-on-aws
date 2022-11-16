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

import { FunctionComponent, useMemo } from 'react';
import FormRenderer, {
    componentTypes,
    validatorTypes,
} from 'aws-northstar/components/FormRenderer';
import AttributeReview from './components/Review';
import { AttributeFormData } from '../../../types';

export interface AttributeFormProps {
    onSubmit: (data: AttributeFormData) => void;
    onCancel: () => void;
    isUpdate?: boolean;
    initialValues?: AttributeFormData;
}

const AttributeForm: FunctionComponent<AttributeFormProps> = ({
    onSubmit,
    onCancel,
    isUpdate = false,
    initialValues = {},
}) => {
    const detailsSubForm = useMemo(() => {
        return {
            name: 'attributeDetails',
            title: 'Attribute Details',
            fields: [
                {
                    component: componentTypes.TEXT_FIELD,
                    name: 'key',
                    label: 'Key',
                    helperText: 'Attribute key is case insensitive',
                    isRequired: true,
                    isReadOnly: isUpdate,
                    validate: [
                        {
                            type: validatorTypes.REQUIRED,
                        },
                        {
                            type: validatorTypes.PATTERN,
                            pattern: /^\w+$/,
                        },
                        {
                            type: validatorTypes.MAX_LENGTH,
                            threshold: 120,
                        },
                    ],
                },
                {
                    component: componentTypes.TEXT_FIELD,
                    name: 'value',
                    label: 'Value',
                    helperText: 'Attribute value is case insensitive',
                    isRequired: true,
                    isReadOnly: isUpdate,
                    validate: [
                        {
                            type: validatorTypes.REQUIRED,
                        },
                        {
                            type: validatorTypes.PATTERN,
                            pattern: /^\w+$/,
                        },
                        {
                            type: validatorTypes.MAX_LENGTH,
                            threshold: 120,
                        },
                    ],
                },
                {
                    component: componentTypes.TEXTAREA,
                    name: 'description',
                    label: 'Description',
                    isRequired: true,
                },
            ],
        };
    }, [isUpdate]);

    const metadataSubForm = useMemo(() => {
        return {
            title: 'Attribute Metadata',
            name: 'metadataForm',
            fields: [
                {
                    component: componentTypes.FIELD_ARRAY,
                    name: 'metadata',
                    fields: [
                        {
                            component: componentTypes.TEXT_FIELD,
                            label: 'Key',
                            name: 'key',
                            dataType: 'string',
                            validate: [
                                { type: validatorTypes.REQUIRED },
                                {
                                    type: validatorTypes.PATTERN,
                                    pattern: /^(?!aws:)[a-zA-Z+\-=._:/]{1,128}$/,
                                },
                            ],
                        },
                        {
                            component: componentTypes.TEXT_FIELD,
                            label: 'Value',
                            name: 'value',
                            dataType: 'string',
                            validate: [
                                { type: validatorTypes.REQUIRED },
                                {
                                    type: validatorTypes.PATTERN,
                                    pattern: /^[\w.:/=+\-@]{1,256}$/,
                                },
                            ],
                        },
                    ],
                },
            ],
        };
    }, []);

    const schema = useMemo(() => {
        return {
            header: isUpdate ? 'Update Attribute' : 'Create Attribute',
            fields: [
                {
                    component: componentTypes.WIZARD,
                    name: 'CreateAttributeWizard',
                    fields: [
                        detailsSubForm,
                        metadataSubForm,
                        {
                            name: 'review',
                            title: 'Review',
                            fields: [
                                {
                                    component: componentTypes.REVIEW,
                                    name: 'review',
                                    Template: AttributeReview,
                                },
                            ],
                        },
                    ],
                },
            ],
        };
    }, [isUpdate, metadataSubForm, detailsSubForm]);

    return (
        <FormRenderer
            schema={schema}
            onSubmit={onSubmit}
            onCancel={onCancel}
            initialValues={initialValues}
        />
    );
};

export default AttributeForm;
