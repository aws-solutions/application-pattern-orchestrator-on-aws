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
import {
    handler,
    notifySubscribers,
} from '../../../../lambda/codepipeline/blueprint/register';
import { mockClient } from 'aws-sdk-client-mock';
import {
    CodePipelineClient,
    PutJobSuccessResultCommand,
} from '@aws-sdk/client-codepipeline';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { CodePipelineEvent, Context } from 'aws-lambda';
import { FIXTURE_GET_PATTERN_RESPONSE } from './publish.test';
import { BlueprintVersionObject } from '../../../../lambda/codepipeline/types/BlueprintTypes';

const BLUEPRINT_ID = 'BLUEPRINT_ID';
const ALL_PACKAGES = `
[
    {
      "name": "package_test1",
      "version": "1.0.0",
      "location": "/var/ws/packages/package_test1" 
    },
    {
      "name": "package_test2",
      "version": "1.0.0",
      "location": "/var/ws/packages/package_test2"
    }
]`;

const CHANGED_PACKAGES = `
[
    {
        "name": "package_test1",
        "version": "1.0.0",
        "location": "/var/ws/packages/package_test1"
    }
]`;

process.env.BLUEPRINT_ID = BLUEPRINT_ID;

const ddbMock = mockClient(DynamoDBDocumentClient);
const cpMock = mockClient(CodePipelineClient);
const snsMock = mockClient(SNSClient);

describe('Register blueprint handler tests', () => {
    const processEnv = process.env;

    beforeEach(() => {
        jest.resetAllMocks();
        ddbMock.reset();
        cpMock.reset();
        snsMock.reset();
        ddbMock.on(GetCommand).resolves(FIXTURE_GET_PATTERN_RESPONSE);
        process.env = { ...processEnv };
    });

    test('do nothing if user parameters is empty', async () => {
        await handler(
            {
                'CodePipeline.job': {
                    id: '',
                    data: {
                        actionConfiguration: {
                            configuration: {
                                UserParameters: '{}',
                            },
                        },
                    },
                },
            } as CodePipelineEvent,
            {} as Context
        );
    });

    test('do nothing if version name is empty', async () => {
        await handler(
            {
                'CodePipeline.job': {
                    id: '',
                    data: {
                        actionConfiguration: {
                            configuration: {
                                UserParameters: JSON.stringify({
                                    VERSION_NAME: '',
                                }),
                            },
                        },
                    },
                },
            } as CodePipelineEvent,
            {} as Context
        );
        expect(cpMock.calls()).toHaveLength(1);
        expect(cpMock.call(0).firstArg).toBeInstanceOf(PutJobSuccessResultCommand);
        expect(ddbMock.calls()).toHaveLength(0);
    });

    test('register a blueprint', async () => {
        await handler(
            {
                'CodePipeline.job': {
                    id: '',
                    data: {
                        actionConfiguration: {
                            configuration: {
                                UserParameters: JSON.stringify({
                                    VERSION_NAME: '1',
                                    VERSION_COMMIT_ID: 'commitabcd',
                                    VERSION_COMMIN_MESSAGE: 'commit message test',
                                    CHANGED_PACKAGES:
                                        Buffer.from(CHANGED_PACKAGES).toString('base64'),
                                    ALL_PACKAGES:
                                        Buffer.from(ALL_PACKAGES).toString('base64'),
                                }),
                            },
                        },
                    },
                },
            } as CodePipelineEvent,
            {} as Context
        );

        expect(cpMock.calls()).toHaveLength(1);
        expect(cpMock.call(0).firstArg).toBeInstanceOf(PutJobSuccessResultCommand);
        expect(snsMock.calls()).toHaveLength(1);
        expect(snsMock.call(0).firstArg).toBeInstanceOf(PublishCommand);
        expect(ddbMock.calls()).toHaveLength(2);
        expect(ddbMock.call(0).firstArg?.input?.TransactItems).toMatchObject([
            {
                Put: {
                    Item: {
                        patternId: 'BLUEPRINT_ID',
                        commitId: 'commitabcd',
                        createdTimestamp: expect.any(String),
                        updatedTimestamp: expect.any(String),
                        allPackages: [
                            {
                                version: '1.0.0',
                                name: 'package_test1',
                            },
                            {
                                version: '1.0.0',
                                name: 'package_test2',
                            },
                        ],
                        changedPackages: [
                            {
                                version: '1.0.0',
                                name: 'package_test1',
                            },
                        ],
                    },
                },
            },
            {
                Update: {
                    Key: {
                        patternId: BLUEPRINT_ID,
                    },
                    ExpressionAttributeValues: {
                        ':lastCommitId': 'commitabcd',
                        ':updatedTimestamp': expect.any(String),
                    },
                },
            },
        ]);
    });

    test('register a blueprint with service catalog products', async () => {
        const serviceCatalogProduct = {
            name: `${BLUEPRINT_ID}_test`,
            productId: '123',
            provisioningArtifactId: '123',
        };
        await handler(
            {
                'CodePipeline.job': {
                    id: '',
                    data: {
                        actionConfiguration: {
                            configuration: {
                                UserParameters: JSON.stringify({
                                    VERSION_NAME: '1',
                                    VERSION_COMMIT_ID: 'commitabcd',
                                    VERSION_COMMIN_MESSAGE: 'commit message test',
                                    CHANGED_SERVICE_CATALOG_PRODUCTS: Buffer.from(
                                        JSON.stringify([serviceCatalogProduct])
                                    ).toString('base64'),
                                    ALL_SERVICE_CATALOG_PRODUCTS: Buffer.from(
                                        JSON.stringify([serviceCatalogProduct])
                                    ).toString('base64'),
                                    CHANGED_PACKAGES:
                                        Buffer.from(CHANGED_PACKAGES).toString('base64'),
                                    ALL_PACKAGES:
                                        Buffer.from(ALL_PACKAGES).toString('base64'),
                                }),
                            },
                        },
                    },
                },
            } as CodePipelineEvent,
            {} as Context
        );
        expect(cpMock.calls()).toHaveLength(1);
        expect(cpMock.call(0).firstArg).toBeInstanceOf(PutJobSuccessResultCommand);
        expect(ddbMock.calls()).toHaveLength(2);
        expect(ddbMock.call(0).firstArg?.input?.TransactItems).toMatchObject([
            {
                Put: {
                    Item: {
                        patternId: 'BLUEPRINT_ID',
                        commitId: 'commitabcd',
                        createdTimestamp: expect.any(String),
                        updatedTimestamp: expect.any(String),
                        allPackages: [
                            {
                                version: '1.0.0',
                                name: 'package_test1',
                            },
                            {
                                version: '1.0.0',
                                name: 'package_test2',
                            },
                        ],
                        changedPackages: [
                            {
                                version: '1.0.0',
                                name: 'package_test1',
                            },
                        ],
                        changedServiceCatalogProducts: [
                            {
                                name: 'BLUEPRINT_ID_test',
                                productId: '123',
                                provisioningArtifactId: '123',
                            },
                        ],
                        allServiceCatalogProducts: [
                            {
                                name: 'BLUEPRINT_ID_test',
                                productId: '123',
                                provisioningArtifactId: '123',
                            },
                        ],
                    },
                },
            },
            {
                Update: {
                    Key: {
                        patternId: BLUEPRINT_ID,
                    },
                    ExpressionAttributeValues: {
                        ':lastCommitId': 'commitabcd',
                        ':updatedTimestamp': expect.any(String),
                    },
                },
            },
        ]);
    });

    test('register a blueprint with artifacts', async () => {
        await handler(
            {
                'CodePipeline.job': {
                    id: '',
                    data: {
                        actionConfiguration: {
                            configuration: {
                                UserParameters: JSON.stringify({
                                    VERSION_NAME: '1',
                                    VERSION_COMMIT_ID: 'commitabcd',
                                    VERSION_COMMIN_MESSAGE: 'commit message test',
                                    CONTROL_ARTIFACTS_LOCATION: 'controls',
                                    CONTROL_ARTIFACTS_NAMES: 'cfn_nag.txt',
                                    IMAGE_ARTIFACTS_LOCATION: 'test/version',
                                    IMAGE_ARTIFACTS_NAMES: 'img1.png,img2.png',
                                    CHANGED_PACKAGES:
                                        Buffer.from(CHANGED_PACKAGES).toString('base64'),
                                    ALL_PACKAGES:
                                        Buffer.from(ALL_PACKAGES).toString('base64'),
                                }),
                            },
                        },
                    },
                },
            } as CodePipelineEvent,
            {} as Context
        );
        expect(cpMock.calls()).toHaveLength(1);
        expect(cpMock.call(0).firstArg).toBeInstanceOf(PutJobSuccessResultCommand);
        expect(ddbMock.calls()).toHaveLength(2);
        expect(ddbMock.call(0).firstArg?.input?.TransactItems).toMatchObject([
            {
                Put: {
                    Item: {
                        patternId: 'BLUEPRINT_ID',
                        commitId: 'commitabcd',
                        createdTimestamp: expect.any(String),
                        updatedTimestamp: expect.any(String),
                        allPackages: [
                            {
                                version: '1.0.0',
                                name: 'package_test1',
                            },
                            {
                                version: '1.0.0',
                                name: 'package_test2',
                            },
                        ],
                        changedPackages: [
                            {
                                version: '1.0.0',
                                name: 'package_test1',
                            },
                        ],
                        artifacts: [
                            {
                                location: 'controls/cfn_nag.txt',
                                name: 'cfn_nag.txt',
                                type: 'CONTROL',
                            },
                            {
                                location: 'test/version/img1.png',
                                name: 'img1.png',
                                type: 'IMAGE',
                            },
                            {
                                location: 'test/version/img2.png',
                                name: 'img2.png',
                                type: 'IMAGE',
                            },
                        ],
                    },
                },
            },
            {
                Update: {
                    Key: {
                        patternId: BLUEPRINT_ID,
                    },
                    ExpressionAttributeValues: {
                        ':lastCommitId': 'commitabcd',
                        ':updatedTimestamp': expect.any(String),
                    },
                },
            },
        ]);
    });

    test('register should fail when updating pipeline fails', async () => {
        cpMock.on(PutJobSuccessResultCommand).rejects();
        const serviceCatalogProduct = {
            name: `${BLUEPRINT_ID}_test`,
            productId: '123',
            provisioningArtifactId: '123',
        };
        const task = (): Promise<void> =>
            handler(
                {
                    'CodePipeline.job': {
                        id: '',
                        data: {
                            actionConfiguration: {
                                configuration: {
                                    UserParameters: JSON.stringify({
                                        VERSION_NAME: '1',
                                        VERSION_COMMIT_ID: 'commitabcd',
                                        VERSION_COMMIN_MESSAGE: 'commit message test',
                                        CHANGED_SERVICE_CATALOG_PRODUCTS: Buffer.from(
                                            JSON.stringify([serviceCatalogProduct])
                                        ).toString('base64'),
                                        ALL_SERVICE_CATALOG_PRODUCTS: Buffer.from(
                                            JSON.stringify([serviceCatalogProduct])
                                        ).toString('base64'),
                                        CHANGED_PACKAGES:
                                            Buffer.from(CHANGED_PACKAGES).toString(
                                                'base64'
                                            ),
                                        ALL_PACKAGES:
                                            Buffer.from(ALL_PACKAGES).toString('base64'),
                                    }),
                                },
                            },
                        },
                    },
                } as CodePipelineEvent,
                {} as Context
            );

        await expect(() => task()).rejects.toThrow();
        expect(cpMock.calls()).toHaveLength(2);
    });

    test('should not send notification when pattern is not found', async () => {
        ddbMock.on(GetCommand).resolvesOnce({});

        const blueprintVersionObject: Partial<BlueprintVersionObject> = {
            patternId: 'testpattern',
        };

        await notifySubscribers(blueprintVersionObject);
        expect(snsMock.calls()).toHaveLength(0);
    });

    test('should send notification for CFN pattern', async () => {
        // when
        const metaTableName = 'meta-table-test';
        const rapmPortalUrl = 'portal-test.com';
        const testPatternId = 'pattern1001';
        const testPatternName = 'pattern1001';
        const testPatternType = 'CDK';
        const testPatternDescription = 'This is a webservice pattern test';
        const testPatternRepoUrl = `git://github.test/${testPatternId}.git`;
        const testAttributes = {
            DataClassification: 'Confidential',
            RiskLevel: 'High',
        };
        const testChangedPackages = [
            { name: `@${testPatternId}/compliant-s3-bucket`, version: '1.1.1' },
            { name: `@${testPatternId}/compliant-webservice`, version: '1.2.1' },
        ];
        const testAllPackages = [
            { name: `@${testPatternId}/compliant-s3-bucket`, version: '1.1.1' },
            { name: `@${testPatternId}/compliant-webservice`, version: '1.2.1' },
            { name: `@${testPatternId}/compliant-route53`, version: '1.3.1' },
        ];
        const testCommitId = 'de135daf59c0078eb03a2b741e353a45e0f7cf95';
        const testCommitMessge = 'This is a test commit message';
        const testAccount = 'foo-account';
        const testRegion = 'foo-region';
        const testServiceCatalogProducts = [
            {
                account: testAccount,
                region: testRegion,
                productId: 'test_product_123',
                name: 'test_product_name1',
            },
            {
                account: testAccount,
                region: testRegion,
                productId: 'test_product_456',
                name: 'test_product_name2',
            },
        ];

        // mock get pattern details by pattern id
        ddbMock
            .on(GetCommand, {
                TableName: metaTableName,
                Key: { patternId: testPatternId },
            })
            .resolves({
                Item: {
                    updatedTimestamp: '2022-07-08T02:33:47.623Z',
                    patternType: testPatternType,
                    patternId: testPatternId,
                    lastCommitId: 'ef727e767659e288c070230965bce001982bdaa4',
                    description: testPatternDescription,
                    patternRepoURL: testPatternRepoUrl,
                    createdTimestamp: '2022-07-04T08:51:49.816Z',
                    name: testPatternName,
                    infrastructureStackStatus: 'UPDATE_COMPLETE',
                    attributes: testAttributes,
                },
            });

        process.env.RAPM_PORTAL_URL = rapmPortalUrl;
        process.env.RAPM_METADATA_TABLE_NAME = metaTableName;

        const blueprintVersionObject: BlueprintVersionObject = {
            patternId: testPatternId,
            commitId: testCommitId,
            commitMessage: testCommitMessge,
            createdTimestamp: '2022-07-26T09:26:21.873Z',
            updatedTimestamp: '2022-07-26T09:26:21.873Z',
            artifacts: [
                {
                    location:
                        'test-blueprint/de135daf59c0078eb03a2b741e353a45e0f7cf95/controls/cfn_nag.txt',
                    type: 'CONTROL',
                    name: 'cfn_nag.txt',
                },
                {
                    location:
                        'test-blueprint/de135daf59c0078eb03a2b741e353a45e0f7cf95/markdown/README.md',
                    type: 'MARKDOWN',
                    name: 'README.md',
                },
            ],
            changedPackages: testChangedPackages,
            allPackages: testAllPackages,
            changedServiceCatalogProducts: testServiceCatalogProducts,
        };

        //act
        await notifySubscribers(blueprintVersionObject);

        //test
        expect(snsMock.calls()).toHaveLength(1);
        expect(snsMock.call(0).firstArg).toBeInstanceOf(PublishCommand);

        const publishCommand = snsMock.call(0).firstArg as PublishCommand;
        expect(publishCommand.input.Message).toEqual(
            JSON.stringify({
                patternId: testPatternId,
                patternName: testPatternName,
                patternDescription: testPatternDescription,
                patternAttributes: testAttributes,
                patternUri: `https://${process.env.RAPM_PORTAL_URL}/patterns/${testPatternId}`,
                commitMessage: testCommitMessge,
                commitId: testCommitId,
                sourceRepo: testPatternRepoUrl.replace('git://', 'https://'),
                modifiedPackages: testChangedPackages,
                serviceCatalog: {
                    account: testAccount,
                    region: testRegion,
                    products: testServiceCatalogProducts.map((p) => p.name),
                },
            })
        );
    });

    test('should send notification for CDK pattern', async () => {
        // when
        const metaTableName = 'meta-table-test';
        const rapmPortalUrl = 'portal-test.com';
        const testPatternId = 'pattern1001';
        const testPatternName = 'pattern1001';
        const testPatternType = 'CDK';
        const testPatternDescription = 'This is a webservice pattern test';
        const testPatternRepoUrl = `git://github.test/${testPatternId}.git`;
        const testAttributes = {
            DataClassification: 'Confidential',
            RiskLevel: 'High',
        };
        const testChangedPackages = [
            { name: `@${testPatternId}/compliant-s3-bucket`, version: '1.1.1' },
            { name: `@${testPatternId}/compliant-webservice`, version: '1.2.1' },
        ];
        const testAllPackages = [
            { name: `@${testPatternId}/compliant-s3-bucket`, version: '1.1.1' },
            { name: `@${testPatternId}/compliant-webservice`, version: '1.2.1' },
            { name: `@${testPatternId}/compliant-route53`, version: '1.3.1' },
        ];
        const testCommitId = 'de135daf59c0078eb03a2b741e353a45e0f7cf95';
        const testCommitMessge = 'This is a test commit message';
        const testAccount = 'foo-account';
        const testRegion = 'foo-region';
        const testCodeArtifactDomain = 'codeartifact-domain-test';
        const testCodeArtifactRepository = 'codeartifact-repository-test';

        // mock get pattern details by pattern id
        ddbMock
            .on(GetCommand, {
                TableName: metaTableName,
                Key: { patternId: testPatternId },
            })
            .resolves({
                Item: {
                    updatedTimestamp: '2022-07-08T02:33:47.623Z',
                    patternType: testPatternType,
                    patternId: testPatternId,
                    lastCommitId: 'ef727e767659e288c070230965bce001982bdaa4',
                    description: testPatternDescription,
                    patternRepoURL: testPatternRepoUrl,
                    createdTimestamp: '2022-07-04T08:51:49.816Z',
                    name: testPatternName,
                    infrastructureStackStatus: 'UPDATE_COMPLETE',
                    attributes: testAttributes,
                },
            });

        process.env.RAPM_PORTAL_URL = rapmPortalUrl;
        process.env.RAPM_METADATA_TABLE_NAME = metaTableName;

        const blueprintVersionObject: BlueprintVersionObject = {
            patternId: testPatternId,
            commitId: testCommitId,
            commitMessage: testCommitMessge,
            createdTimestamp: '2022-07-26T09:26:21.873Z',
            updatedTimestamp: '2022-07-26T09:26:21.873Z',
            artifacts: [
                {
                    location:
                        'test-blueprint/de135daf59c0078eb03a2b741e353a45e0f7cf95/controls/cfn_nag.txt',
                    type: 'CONTROL',
                    name: 'cfn_nag.txt',
                },
                {
                    location:
                        'test-blueprint/de135daf59c0078eb03a2b741e353a45e0f7cf95/markdown/README.md',
                    type: 'MARKDOWN',
                    name: 'README.md',
                },
            ],
            changedPackages: testChangedPackages,
            allPackages: testAllPackages,
            codeArtifactDetails: {
                account: testAccount,
                region: testRegion,
                codeArtifactDomainName: testCodeArtifactDomain,
                codeArtifactRepositoryName: testCodeArtifactRepository,
            },
        };

        //act
        await notifySubscribers(blueprintVersionObject);

        //test
        expect(snsMock.calls()).toHaveLength(1);
        expect(snsMock.call(0).firstArg).toBeInstanceOf(PublishCommand);

        const publishCommand = snsMock.call(0).firstArg as PublishCommand;
        expect(publishCommand.input.Message).toEqual(
            JSON.stringify({
                patternId: testPatternId,
                patternName: testPatternName,
                patternDescription: testPatternDescription,
                patternAttributes: testAttributes,
                patternUri: `https://${process.env.RAPM_PORTAL_URL}/patterns/${testPatternId}`,
                commitMessage: testCommitMessge,
                commitId: testCommitId,
                sourceRepo: testPatternRepoUrl.replace('git://', 'https://'),
                modifiedPackages: testChangedPackages,
                codeArtifact: {
                    account: testAccount,
                    region: testRegion,
                    domain: testCodeArtifactDomain,
                    repository: testCodeArtifactRepository,
                },
            })
        );
    });
});
