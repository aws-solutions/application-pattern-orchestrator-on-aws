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
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { StackStatus } from '@aws-sdk/client-cloudformation';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { when } from 'jest-when';
import { Attribute } from '../../../src/common/common-types';
import { environmentVariables } from '../../../src/common/configuration/AppConfiguration';
import { BlueprintDBService } from '../../../src/service/BlueprintDBService';
import { BlueprintObject } from '../../../src/types/BlueprintType';

process.env[environmentVariables.RAPM_METADATA_TABLE_NAME] = 'RAPM_MetaData';
process.env[environmentVariables.RAPM_PUBLISH_DATA_TABLE_NAME] = 'RAPM_PublishData';
process.env[environmentVariables.RAPM_ATTRIBUTES_TABLE_NAME] = 'RAPM_Attributes';
process.env[environmentVariables.PATTERN_EMAIL_MAPPING_TABLE_NAME] = 'email_mapping';

const mockDocumentClientGet = jest.fn();
const mockDocumentClientPut = jest.fn();
const mockDocumentClientScan = jest.fn();
const mockDocumentClientQuery = jest.fn();
const mockDocumentClientUpdate = jest.fn();
const mockDocumentClientDelete = jest.fn();

jest.mock('aws-sdk/clients/dynamodb', () => ({
    ...jest.requireActual('aws-sdk/clients/dynamodb'),
    DocumentClient: jest.fn(() => ({
        get: mockDocumentClientGet,
        put: mockDocumentClientPut,
        scan: mockDocumentClientScan,
        query: mockDocumentClientQuery,
        update: mockDocumentClientUpdate,
        delete: mockDocumentClientDelete,
    })),
}));

const documentClient = new DocumentClient();
const dataStore = new BlueprintDBService(documentClient);

const bluePrintObject: BlueprintObject = {
    patternId: 'ServerlessApp',
    name: 'ServerlessApp',
    owner: 'awsapjsb',
    email: '123@amazon.com',
    description: 'ServerlessApp',
    patternType: 'CDK',
    infrastructureStackStatus: StackStatus.CREATE_IN_PROGRESS,
    patternRepoURL: 'ssh://ServerlessApp',
    codeRepository: {
        type: 'CDK',
        repoOwner: 'awsapjsb',
        branchName: 'main',
        repoName: 'ServerlessApp',
    },
    deploymentPipelineArn: 'arn:pipleine',
    updatedTimestamp: '10-July-2021',
    createdTimestamp: '10-July-2021',
};

const blueprintPublishObject = {
    patternId: 'ver-test-3-cdk',
    commitId: '3862a94bc2c6e543379ae6c5f4def63c1058354b',
    allPackages: [
        {
            name: '@van-cdk/my-cd-pipeline',
            version: '1.1.2',
        },
        {
            name: '@van-cdk/my-service-pipeline',
            version: '1.2.2',
        },
        {
            name: '@van-cdk/my-service-template',
            version: '1.1.2',
        },
    ],
    artifacts: [
        {
            location:
                'ver-test-3-cdk/3862a94bc2c6e543379ae6c5f4def63c1058354b/controls/cfn_nag.json',
            name: 'cfn_nag.json',
            type: 'CONTROL',
        },
        {
            location:
                'ver-test-3-cdk/3862a94bc2c6e543379ae6c5f4def63c1058354b/markdown/README.md',
            name: 'README.md',
            type: 'MARKDOWN',
        },
    ],
    changedPackages: [
        {
            name: '@van-cdk/my-cd-pipeline',
            version: '1.1.2',
        },
        {
            name: '@van-cdk/my-service-pipeline',
            version: '1.2.2',
        },
        {
            name: '@van-cdk/my-service-template',
            version: '1.1.2',
        },
    ],
    codeArtifactDetails: {
        account: '123456789',
        codeArtifactDomainName: 'awspatterns',
        codeArtifactRepositoryName: 'awspatterns',
        region: 'ap-southeast-2',
    },
    createdTimestamp: '2022-07-13T15:30:07.876Z',
    updatedTimestamp: '2022-07-13T15:30:07.876Z',
};

const attribute: Attribute = {
    id: 'test-attribute-1',
    keyIndex: 'test-key-index',
    name: 'hostingConstruct:lambda',
    description: 'hostingConstruct',
    key: 'hostingConstruct',
    value: 'lambda',
    metadata: {
        key1: 'value1',
    },
    createTime: '2021-11-17T06:02:15.035Z',
    lastUpdateTime: '2021-11-17T06:02:15.035Z',
};

describe('test BlueprintDBService', () => {
    const metaDataTableName = process.env[environmentVariables.RAPM_METADATA_TABLE_NAME];
    const publishDataTableName =
        process.env[environmentVariables.RAPM_PUBLISH_DATA_TABLE_NAME];
    const attributesTableName =
        process.env[environmentVariables.RAPM_ATTRIBUTES_TABLE_NAME];

    beforeEach(() => {
        mockDocumentClientGet.mockClear();
        mockDocumentClientPut.mockClear();
        mockDocumentClientScan.mockClear();
        mockDocumentClientUpdate.mockClear();
        mockDocumentClientQuery.mockClear();
        mockDocumentClientDelete.mockClear();
    });

    test('list blueprints returns empty array if there is no blueprints', async () => {
        mockDocumentClientScan.mockImplementationOnce(() => ({
            promise: () => Promise.resolve({ Items: [] }),
        }));
        await expect(dataStore.listBlueprints()).resolves.toEqual({
            results: [],
            nextToken: undefined,
        });
        expect(mockDocumentClientScan).toBeCalledWith({
            TableName: metaDataTableName,
        });
    });

    test('list blueprints with limit and token', async () => {
        mockDocumentClientScan.mockImplementationOnce(() => ({
            promise: () =>
                Promise.resolve({
                    Items: [bluePrintObject],
                    LastEvaluatedKey: {
                        id: 'xyz',
                    },
                }),
        }));
        await expect(dataStore.listBlueprints(100, 'abc')).resolves.toEqual({
            results: [bluePrintObject],
            nextToken: 'xyz',
        });
        expect(mockDocumentClientScan).toBeCalledWith({
            TableName: metaDataTableName,
            Limit: 100,
            ExclusiveStartKey: { id: 'abc' },
        });
    });

    test('create blueprint object successful', async () => {
        mockDocumentClientPut.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(),
        }));
        await dataStore.createBlueprint(bluePrintObject);
        expect(mockDocumentClientPut).toHaveBeenCalledTimes(1);
        expect(mockDocumentClientPut).toBeCalledWith({
            Item: bluePrintObject,
            TableName: metaDataTableName,
        });
    });

    test('update blueprint object successful', async () => {
        mockDocumentClientUpdate.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(),
        }));
        await dataStore.updateBlueprintMetaData('test-pattern-1', 'test description', {
            dataClassification: 'test1',
        });
        expect(mockDocumentClientUpdate).toHaveBeenCalledTimes(1);
        expect(mockDocumentClientUpdate).toBeCalledWith({
            TableName: metaDataTableName,
            Key: {
                patternId: 'test-pattern-1',
            },
            UpdateExpression:
                'set updatedTimestamp = :updatedTimestamp, description = :patternDescription, attributes = :patternAttributes',
            ExpressionAttributeValues: {
                ':patternDescription': 'test description',
                ':patternAttributes': { dataClassification: 'test1' },
                ':updatedTimestamp': expect.any(String),
            },
        });
    });

    test('get blueprint object by version and ID', async () => {
        when(mockDocumentClientGet)
            .calledWith({
                TableName: metaDataTableName,
                Key: {
                    patternId: bluePrintObject.patternId,
                },
            })
            .mockImplementation(() => ({
                promise: () =>
                    Promise.resolve({
                        Item: bluePrintObject,
                    }),
            }));
        const response = await dataStore.getBlueprintById(bluePrintObject.patternId);
        expect(response).toMatchObject(bluePrintObject);
    });

    test('get blueprint object by version and ID - negative case', async () => {
        mockDocumentClientGet.mockImplementation(() => ({
            promise: () => Promise.resolve({ Item: undefined }),
        }));
        const response = await dataStore.getBlueprintById(bluePrintObject.patternId);
        expect(response).not.toBeDefined();
    });

    test('update Blueprint status ', async () => {
        mockDocumentClientUpdate.mockImplementation(() => ({
            promise: () => Promise.resolve(),
        }));

        await dataStore.updateStatusBlueprintById(
            bluePrintObject.patternId,
            StackStatus.ROLLBACK_FAILED
        );

        expect(mockDocumentClientUpdate).toBeCalledTimes(1);
        expect(mockDocumentClientUpdate).toBeCalledWith({
            TableName: metaDataTableName,
            Key: {
                patternId: bluePrintObject.patternId,
            },
            UpdateExpression:
                'set updatedTimestamp = :updatedTimestamp, infrastructureStackStatus = :patternPipelineInfraStatus',
            ExpressionAttributeValues: {
                ':patternPipelineInfraStatus': 'ROLLBACK_FAILED',
                ':updatedTimestamp': expect.anything(),
            },
        });
    });

    test('get Blueprints publish data by commit id', async () => {
        mockDocumentClientGet.mockImplementation(() => ({
            promise: () =>
                Promise.resolve({
                    Item: blueprintPublishObject,
                }),
        }));

        expect(
            await dataStore.getBlueprintPublishDataByCommitId(
                blueprintPublishObject.patternId,
                blueprintPublishObject.commitId
            )
        ).toMatchObject(blueprintPublishObject);

        expect(mockDocumentClientGet).toBeCalledTimes(1);
        expect(mockDocumentClientGet).toBeCalledWith({
            TableName: publishDataTableName,
            Key: {
                patternId: blueprintPublishObject.patternId,
                commitId: blueprintPublishObject.commitId,
            },
        });
    });

    test('get Blueprints publish data by commit id should negative case', async () => {
        mockDocumentClientGet.mockImplementation(() => ({
            promise: () =>
                Promise.resolve({
                    Item: null,
                }),
        }));

        expect(
            await dataStore.getBlueprintPublishDataByCommitId(
                blueprintPublishObject.patternId,
                blueprintPublishObject.commitId
            )
        ).not.toBeDefined();
    });

    test('create attribute', async () => {
        mockDocumentClientPut.mockImplementation(() => ({
            promise: () => Promise.resolve(),
        }));

        await dataStore.createAttribute(attribute.id, attribute);
        expect(mockDocumentClientPut).toBeCalledWith({
            TableName: attributesTableName,
            Item: {
                ...attribute,
                id: attribute.id,
            },
        });
    });

    test('list attributes', async () => {
        mockDocumentClientScan.mockImplementation(() => ({
            promise: () =>
                Promise.resolve({
                    Items: [attribute],
                    LastEvaluatedKey: {
                        id: 'xyz',
                    },
                }),
        }));

        const attributes = await dataStore.listAttributes(100, 'abc');
        expect(attributes.length).toBe(2);
        expect(attributes[0][0]).toMatchObject(attribute);
        expect(attributes[1]).toBe('xyz');
        expect(mockDocumentClientScan).toBeCalledWith({
            TableName: attributesTableName,
            Limit: 100,
            ExclusiveStartKey: { id: 'abc' },
        });
    });

    test('list attributes - negative case', async () => {
        mockDocumentClientScan.mockImplementation(() => ({
            promise: () =>
                Promise.resolve({
                    Items: undefined,
                }),
        }));

        const attributes = await dataStore.listAttributes(100, 'abc');
        expect(attributes.length).toBe(2);
        expect(attributes[0]).not.toBeDefined();
        expect(attributes[1]).not.toBeDefined();
        expect(mockDocumentClientScan).toBeCalledWith({
            TableName: attributesTableName,
            Limit: 100,
            ExclusiveStartKey: { id: 'abc' },
        });
    });

    test('delete attribute', async () => {
        mockDocumentClientDelete.mockImplementation(() => ({
            promise: () => Promise.resolve(),
        }));

        await dataStore.deleteAttribute(attribute.id);

        expect(mockDocumentClientDelete).toBeCalledWith({
            TableName: attributesTableName,
            Key: {
                id: attribute.id,
            },
        });
    });

    test('get attribute by id', async () => {
        mockDocumentClientGet.mockImplementation(() => ({
            promise: () =>
                Promise.resolve({
                    Item: attribute,
                }),
        }));
        expect(await dataStore.getAttributeById(attribute.id)).toMatchObject(attribute);
    });

    test('get attribute by id - negative case', async () => {
        mockDocumentClientGet.mockImplementation(() => ({
            promise: () =>
                Promise.resolve({
                    Item: undefined,
                }),
        }));
        expect(await dataStore.getAttributeById(attribute.id)).not.toBeDefined();
    });

    test('update attribute', async () => {
        mockDocumentClientPut.mockImplementationOnce(() => ({
            promise: () => {
                return Promise.resolve();
            },
        }));

        await dataStore.updateAttribute(attribute.id, attribute);

        expect(mockDocumentClientPut).toBeCalledWith({
            TableName: attributesTableName,
            Item: {
                ...attribute,
                id: attribute.id,
            },
        });
    });

    test('create notification subscription', async () => {
        mockDocumentClientPut.mockImplementationOnce(() => ({
            promise: () => {
                return Promise.resolve();
            },
        }));

        await dataStore.createNotificationSubscription('1234', 'email');

        expect(mockDocumentClientPut).toBeCalledWith({
            TableName: 'email_mapping',
            Item: {
                patternId: '1234',
                email: 'email',
            },
        });
    });

    test('delete notification subscription', async () => {
        mockDocumentClientDelete.mockImplementationOnce(() => ({
            promise: () => {
                return Promise.resolve();
            },
        }));

        await dataStore.deleteNotificationSubscription('1234', 'email');

        expect(mockDocumentClientDelete).toBeCalledWith({
            TableName: 'email_mapping',
            Key: { patternId: '1234', email: 'email' },
        });
    });
});
