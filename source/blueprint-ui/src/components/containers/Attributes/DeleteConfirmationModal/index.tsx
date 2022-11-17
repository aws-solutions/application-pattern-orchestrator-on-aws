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
import Alert from 'aws-northstar/components/Alert';
import DeleteConfirmationDialog from 'aws-northstar/advanced/DeleteConfirmationDialog';

export interface AttributeDeleteConfirmationModalProps {
    attributeName: string;
    visible: boolean;
    setVisible: (visible: boolean) => void;
    onConfirmed: () => void;
    isDeleting?: boolean;
}

const AttributeDeleteConfirmationModal: FunctionComponent<
    AttributeDeleteConfirmationModalProps
> = ({ attributeName, visible, setVisible, onConfirmed, isDeleting }) => {
    return (
        <DeleteConfirmationDialog
            title={`Delete ${attributeName}`}
            visible={visible}
            onCancelClicked={() => {
                setVisible(false);
            }}
            onDeleteClicked={onConfirmed}
            loading={isDeleting}
        >
            <Alert type="warning">
                Delete Attribute {attributeName}? This action cannot be undone.
            </Alert>
        </DeleteConfirmationDialog>
    );
};

export default AttributeDeleteConfirmationModal;
