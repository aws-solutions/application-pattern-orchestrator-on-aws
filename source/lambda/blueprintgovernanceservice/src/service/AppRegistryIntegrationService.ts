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
import * as AWS from 'aws-sdk';
import { container } from 'tsyringe';
import { Attribute, BasicHttpError } from '../common/common-types';
import { AppConfiguration } from '../common/configuration/AppConfiguration';
import { customUserAgentString } from '../common/customUserAgent';
import { getLogger } from '../common/BaseContainer';

const client = new AWS.ServiceCatalogAppRegistry({
    apiVersion: '2020-06-24',
    customUserAgent: customUserAgentString,
    region: process.env.AWS_REGION,
});

function makeAttributeGroupName(key: string, value: string): string {
    return `APO.${key.toUpperCase()}.${value.toUpperCase()}`;
}

function makeAttributeGroupNameFromId(id: string): string {
    const [key, value] = id.split(':');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return makeAttributeGroupName(key ?? '', value ?? '');
}

const logger = getLogger('AppRegistryIntegration');

function getTags(): { managedBy: string } {
    return {
        managedBy:
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            container.resolve<AppConfiguration>('AppConfiguration').applicationName ??
            'Rapm',
    };
}

export async function checkAttributeExist(name: string): Promise<boolean> {
    const [key, value] = name.split(':');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const attributeGroupName = makeAttributeGroupName(key ?? '', value ?? '');
    // check if attribute group exists
    try {
        await client
            .getAttributeGroup({
                attributeGroup: attributeGroupName,
            })
            .promise();
        return true;
        /* eslint-disable-next-line */
    } catch (err: any) {
        if (err.code === 'ResourceNotFoundException') {
            return false;
        } else {
            logger.error(
                `Error read attribute group ${attributeGroupName} from AppRegistry. Error: ${JSON.stringify(
                    err
                )}`
            );
            throw err;
        }
    }
}

export async function updateAttribute(data: Attribute): Promise<void> {
    logger.info(`update attribute ${data.name} in AppRegistry`);

    let doCreate = false;
    const attributeGroupName = makeAttributeGroupName(data.key, data.value);

    // check if attribute group exists
    let existingAttributeGroup:
        | AWS.ServiceCatalogAppRegistry.GetAttributeGroupResponse
        | undefined = undefined;
    try {
        existingAttributeGroup = await client
            .getAttributeGroup({
                attributeGroup: attributeGroupName,
            })
            .promise();
        logger.info(`attribute group ${attributeGroupName} exist, update existing one`);
        /* eslint-disable-next-line */
    } catch (err: any) {
        // // check if it is not found error
        if (err.code === 'ResourceNotFoundException') {
            doCreate = true;
            logger.info(
                `attribute group ${attributeGroupName} not found, create a new one`
            );
        } else {
            logger.error(
                `Error read attribute group ${attributeGroupName} from AppRegistry. Error: ${JSON.stringify(
                    err
                )}`
            );
            throw err;
        }
    }

    const params = {
        name: attributeGroupName,
        description: data.description,
        attributes: JSON.stringify({
            ...data.metadata,
            attributeName: data.name,
            attributeKey: data.key,
            attributeValue: data.value,
            attributeCreateTime: data.createTime,
            attributeLastUpdateTime: data.lastUpdateTime,
        }),
    };

    const tags = getTags();

    if (doCreate) {
        await client.createAttributeGroup({ ...params, clientToken: '', tags }).promise();
        logger.info('attribute group created.');
    } else {
        // check if attribute group actually need to be updated
        const tagsMatch =
            Object.entries(tags).filter(
                ([key, value]) => existingAttributeGroup?.tags?.[key] === value
            ).length === Object.keys(tags).length;

        if (
            !tagsMatch ||
            existingAttributeGroup?.description !== params.description ||
            existingAttributeGroup.attributes !== params.attributes
        ) {
            // do update
            const { attributeGroup } = await client
                .updateAttributeGroup({ ...params, attributeGroup: attributeGroupName })
                .promise();

            logger.info('attribute group updated.');

            // update tags, this doesn't not delete existing tags.
            if (attributeGroup?.arn) {
                await client
                    .tagResource({
                        resourceArn: attributeGroup.arn,
                        tags,
                    })
                    .promise();
                logger.info('attribute group tags updated.');
            } else {
                logger.error(
                    `updateAttributeGroup does not return valid response. attributeGroupName: ${attributeGroupName}`
                );
                // eslint-disable-next-line @typescript-eslint/no-throw-literal
                throw new BasicHttpError(
                    500,
                    `Failed to update tags on attribute group. attributeGroupName: ${attributeGroupName}`
                );
            }
        } else {
            logger.info('attribute group is up-to-date, skip update.');
        }
    }
}

export async function deleteAttribute(id: string): Promise<void> {
    logger.info(`delete attribute ${id} from AppRegistry`);

    const attributeGroupName = makeAttributeGroupNameFromId(id);

    let doDelete = false;
    // check if attribute group exists
    try {
        await client
            .getAttributeGroup({
                attributeGroup: attributeGroupName,
            })
            .promise();
        logger.info(`attribute group ${attributeGroupName} exist, delete it`);
        doDelete = true;
        /* eslint-disable-next-line */
    } catch (err: any) {
        // // check if it is not found error
        if (err.code === 'ResourceNotFoundException') {
            logger.info(`attribute group ${attributeGroupName} not found, skip delete`);
        } else {
            logger.error(
                `Error read attribute group ${attributeGroupName} from AppRegistry. Error: ${JSON.stringify(
                    err
                )}`
            );
            throw err;
        }
    }

    if (doDelete) {
        await client
            .deleteAttributeGroup({ attributeGroup: attributeGroupName })
            .promise();
        logger.info('attribute group deleted.');
    }
}
