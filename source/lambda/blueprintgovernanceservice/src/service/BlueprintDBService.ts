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
/* eslint-disable @typescript-eslint/naming-convention */
import 'reflect-metadata';

import AWS from 'aws-sdk';
import { inject, injectable } from 'tsyringe';
import { BlueprintObject, PaginatedResult } from '../types/BlueprintType';
import { environmentVariables } from '../common/configuration/AppConfiguration';
import { Attribute } from '../common/common-types';

/**
 * Blueprint dbservice
 */
@injectable()
export class BlueprintDBService {
    /**
     * RAPM meta data table name
     */
    private readonly rapmMetaDataTableName: string;
    /**
     * RAPM publish data table name
     */
    private readonly rapmPublishDataTableName: string;
    /**
     * RAPM publish data table name
     */
    private readonly rapmAttributesTableName: string;

    /**
     * Pattern email mapping table for notifications
     */
    private readonly patternEmailMappingTableName: string;

    /**
     * Creates an instance of blueprint dbservice.
     * @param documentClient
     */
    public constructor(
        @inject('DocumentClient')
        private readonly documentClient: AWS.DynamoDB.DocumentClient
    ) {
        this.rapmMetaDataTableName =
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            process.env[environmentVariables.RAPM_METADATA_TABLE_NAME]!;
        this.rapmPublishDataTableName =
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            process.env[environmentVariables.RAPM_PUBLISH_DATA_TABLE_NAME]!;
        this.rapmAttributesTableName =
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            process.env[environmentVariables.RAPM_ATTRIBUTES_TABLE_NAME]!;
        this.patternEmailMappingTableName =
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            process.env[environmentVariables.PATTERN_EMAIL_MAPPING_TABLE_NAME]!;
    }

    public async createBlueprint(patternObject: BlueprintObject): Promise<void> {
        const params = {
            TableName: this.rapmMetaDataTableName,
            Item: patternObject,
        };
        await this.documentClient.put(params).promise();
    }

    /**
     * Lists blueprints
     * @param [limit]
     * @param [nextToken]
     * @returns blueprints
     */
    public async listBlueprints(
        limit?: number,
        nextToken?: string
    ): Promise<PaginatedResult<BlueprintObject[]>> {
        const params = {
            TableName: this.rapmMetaDataTableName,
            ...(limit && { Limit: limit }),
            ...(nextToken && { ExclusiveStartKey: { id: nextToken } }),
        };

        const response = await this.documentClient.scan(params).promise();
        return {
            results: response.Items as BlueprintObject[],
            nextToken: response.LastEvaluatedKey?.id,
        };
    }

    /**
     * Gets blueprint by id
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async getBlueprintById(patternId: string): Promise<any | undefined> {
        const params = {
            TableName: this.rapmMetaDataTableName,
            Key: {
                patternId,
            },
        };
        const response = await this.documentClient.get(params).promise();
        return response.Item ? response.Item : undefined;
    }

    /**
     * Get pattern publish data by blueprintId id and commitId
     *
     * @param patternId
     * @param commitId
     * @returns pattern publish data
     */
    public async getBlueprintPublishDataByCommitId(
        patternId: string,
        commitId: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any | undefined> {
        const params = {
            TableName: this.rapmPublishDataTableName,
            Key: {
                patternId,
                commitId,
            },
        };

        const response = await this.documentClient.get(params).promise();

        if (response.Item) {
            return response.Item;
        }
        return undefined;
    }

    /**
     * Update pattern pipeline infra status
     * @param id
     * @param patternPipelineInfraStatus
     */
    public async updateStatusBlueprintById(
        id: string,
        patternPipelineInfraStatus: string
    ): Promise<void> {
        const params = {
            TableName: this.rapmMetaDataTableName,
            Key: {
                patternId: id,
            },
            UpdateExpression:
                'set updatedTimestamp = :updatedTimestamp, infrastructureStackStatus = :patternPipelineInfraStatus',
            ExpressionAttributeValues: {
                ':patternPipelineInfraStatus': patternPipelineInfraStatus,
                ':updatedTimestamp': new Date().toISOString(),
            },
        };

        await this.documentClient.update(params).promise();
    }

    /**
     * Update pattern metadata
     * @param id
     * @param description
     * @param attributes
     */
    public async updateBlueprintMetaData(
        id: string,
        description: string,
        attributes?: Record<string, string>
    ): Promise<void> {
        const params = {
            TableName: this.rapmMetaDataTableName,
            Key: {
                patternId: id,
            },
            UpdateExpression:
                'set updatedTimestamp = :updatedTimestamp, description = :patternDescription, attributes = :patternAttributes',
            ExpressionAttributeValues: {
                ':patternDescription': description,
                ':patternAttributes': attributes,
                ':updatedTimestamp': new Date().toISOString(),
            },
        };

        await this.documentClient.update(params).promise();
    }

    /**
     * Get attribute by id
     * @param id
     * @returns
     */
    public async getAttributeById(id: string): Promise<Attribute | undefined> {
        const params = {
            TableName: this.rapmAttributesTableName,
            Key: {
                id,
            },
        };
        const response = await this.documentClient.get(params).promise();
        return response.Item ? (response.Item as Attribute) : undefined;
    }

    /**
     * Create Attribute
     * @param attribute
     */
    public async createAttribute(id: string, attribute: Attribute): Promise<void> {
        return this.updateAttribute(id, attribute);
    }

    /**
     * Delete Attribute
     * @param attribute
     */
    public async deleteAttribute(id: string): Promise<void> {
        const params = {
            TableName: this.rapmAttributesTableName,
            Key: {
                id,
            },
        };
        await this.documentClient.delete(params).promise();
    }

    /**
     * Lists attributes
     * @param [limit]
     * @param [nextToken]
     * @returns attributes
     */
    public async listAttributes(
        limit?: number,
        nextToken?: string
    ): Promise<[Attribute[], string]> {
        const params = {
            TableName: this.rapmAttributesTableName,
            ...(limit && { Limit: limit }),
            ...(nextToken && { ExclusiveStartKey: { id: nextToken } }),
        };

        const response = await this.documentClient.scan(params).promise();
        return [response.Items as Attribute[], response.LastEvaluatedKey?.id];
    }

    /**
     * Update Attribute
     * @param attribute
     */
    public async updateAttribute(id: string, attribute: Attribute): Promise<void> {
        const params = {
            TableName: this.rapmAttributesTableName,
            Item: {
                ...attribute,
                id,
            },
        };
        await this.documentClient.put(params).promise();
    }

    public async createNotificationSubscription(
        patternId: string,
        email: string
    ): Promise<void> {
        await this.documentClient
            .put({
                TableName: this.patternEmailMappingTableName,
                Item: { patternId, email },
            })
            .promise();
    }

    public async deleteNotificationSubscription(
        patternId: string,
        email: string
    ): Promise<void> {
        await this.documentClient
            .delete({
                TableName: this.patternEmailMappingTableName,
                Key: { patternId, email },
            })
            .promise();
    }

    public async getNotificationSubscription(
        patternId: string,
        email: string
    ): Promise<Record<string, unknown> | undefined> {
        const item = await this.documentClient
            .get({
                TableName: this.patternEmailMappingTableName,
                Key: { patternId, email },
            })
            .promise();

        return item.Item;
    }
}
