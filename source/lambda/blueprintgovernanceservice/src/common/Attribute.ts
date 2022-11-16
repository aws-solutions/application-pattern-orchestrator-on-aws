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

import { Attribute } from './common-types';
import { container } from 'tsyringe';
import { LoggerFactory } from './logging';
import { BlueprintDBService } from '../service/BlueprintDBService';
import {
    checkAttributeExist,
    deleteAttribute,
    updateAttribute,
} from '../service/AppRegistryIntegrationService';

export function makeAttributeId(key: string, value: string): string {
    return `${key.toUpperCase()}:${value.toUpperCase()}`;
}

export function makeAttributeName(key: string, value: string): string {
    return `${key}:${value}`;
}

export function transformOutput(item: Attribute): Partial<Attribute> {
    return {
        name: item.name,
        description: item.description,
        key: item.key,
        value: item.value,
        metadata: item.metadata,
        createTime: item.createTime,
        lastUpdateTime: item.lastUpdateTime,
    };
}

export async function syncAttribute(attributeId: string): Promise<void> {
    const logger = container
        .resolve<LoggerFactory>('LoggerFactory')
        .getLogger('AppRegistryIntegration');
    const blueprintDBService =
        container.resolve<BlueprintDBService>('BlueprintDBService');
    const id = attributeId.toUpperCase();
    const attribute = await blueprintDBService.getAttributeById(id);

    let isDelete = false;
    if (!attribute || !('id' in attribute)) {
        // the specified item not found
        if (!(await checkAttributeExist(id))) {
            // the specified item not found in both dynamodb and app registry
            throw new Error(`Specified attribute is not found. id: ${id}`);
        } else {
            isDelete = true;
        }
    }

    if (!isDelete) {
        logger.info(`Updating attribute in AppRegistry. Attribute Name: ${id}`);
        if (attribute) {
            await updateAttribute(attribute);
        }
        logger.info(`Attribute updated in AppRegistry. Attribute Name: ${id}`);
    } else {
        logger.info(`Deleting attribute from AppRegistry. Attribute Name: ${id}`);
        await deleteAttribute(id);
        logger.info(`Attribute deleted from AppRegistry. Attribute Name: ${id}`);
    }
}
