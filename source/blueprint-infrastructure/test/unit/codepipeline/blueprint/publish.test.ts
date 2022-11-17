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

import fs from 'fs';
import path from 'path';
import * as publishModule from '../../../../lambda/codepipeline/blueprint/publish';
import { mockClient } from 'aws-sdk-client-mock';
import {
    CodePipelineClient,
    PutJobFailureResultCommand,
    PutJobSuccessResultCommand,
} from '@aws-sdk/client-codepipeline';
import {
    ServiceCatalogClient,
    DescribeProductAsAdminCommand,
    CreateProductCommand,
    CreateProvisioningArtifactCommand,
    AssociateProductWithPortfolioCommand,
} from '@aws-sdk/client-service-catalog';
import { ListObjectsCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
    CloudFormationClient,
    ValidateTemplateCommand,
} from '@aws-sdk/client-cloudformation';

import { CodePipelineEvent, Context } from 'aws-lambda';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const BLUEPRINT_ID = 'BLUEPRINT_ID';
const TEMPLATE_NAME = 'package_test1';

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

export const FIXTURE_GET_PATTERN_RESPONSE = {
    Item: {
        updatedTimestamp: '2022-07-08T02:33:47.623Z',
        blueprintType: 'CFN',
        blueprintId: 'ver-test-3-cfn',
        lastCommitId: 'ef727e767659e288c070230965bce001982bdaa4',
        description: 'Test CFN based pattern',
        patternRepoURL: 'git://test/ver-test-3-cfn.git',
        createdTimestamp: '2022-07-04T08:51:49.816Z',
        name: 'ver-test-3-cfn',
        infrastructureStackStatus: 'UPDATE_COMPLETE',
        attributes: {
            DataClassification: 'Confidential',
            RiskLevel: 'High',
        },
    },
};

process.env.BLUEPRINT_ID = BLUEPRINT_ID;

const scMock = mockClient(ServiceCatalogClient);
const cpMock = mockClient(CodePipelineClient);
const s3Mock = mockClient(S3Client);
const cloudFormationClientMock = mockClient(CloudFormationClient);
const ddbMock = mockClient(DynamoDBDocumentClient);

const fixtureDynamoDbCfnTemplateJunk = "'";

const fixtureDynamoDbCfnTemplateYml = `
AWSTemplateFormatVersion: 2010-09-09
Description: >-
  AWS CloudFormation Sample Template DynamoDB_Table: This template demonstrates
  the creation of a DynamoDB table.  **WARNING** This template creates an Amazon
  DynamoDB table. You will be billed for the AWS resources used if you create a
  stack from this template.
Parameters:
  HashKeyElementName:
    Description: HashType PrimaryKey Name
    Type: String
    AllowedPattern: '[a-zA-Z0-9]*'
    MinLength: '1'
    MaxLength: '2048'
    ConstraintDescription: must contain only alphanumberic characters
  HashKeyElementType:
    Description: HashType PrimaryKey Type
    Type: String
    Default: S
    AllowedPattern: '[S|N]'
    MinLength: '1'
    MaxLength: '1'
    ConstraintDescription: must be either S or N
Resources:
  myDynamoDBTable:
    Type: 'AWS::DynamoDB::Table'
    Properties:
      AttributeDefinitions:
        - AttributeName: !Ref HashKeyElementName
          AttributeType: !Ref HashKeyElementType
      KeySchema:
        - AttributeName: !Ref HashKeyElementName
          KeyType: HASH
      ProvisionedThroughput:
        ReadCapacityUnits: !Ref ReadCapacityUnits
        WriteCapacityUnits: !Ref WriteCapacityUnits
`;

const fixtureDynamoDbCfnTemplateJson = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description:
        'AWS CloudFormation Sample Template DynamoDB_Table: This template demonstrates the creation of a DynamoDB table.  **WARNING** This template creates an Amazon DynamoDB table. You will be billed for the AWS resources used if you create a stack from this template.',
};

describe('Publish CFN blueprint handler tests', () => {
    beforeEach(() => {
        scMock.reset();
        cpMock.reset();
        s3Mock.reset();
        cloudFormationClientMock.reset();
        ddbMock.reset();
        ddbMock.on(GetCommand).resolves(FIXTURE_GET_PATTERN_RESPONSE);
        s3Mock.on(GetObjectCommand).resolves({
            Body: fs.createReadStream(path.resolve(__dirname, 'publish.test.ts')),
        });
        cloudFormationClientMock.on(ValidateTemplateCommand).resolves({
            $metadata: {
                httpStatusCode: 200,
            },
        });
    });

    test('streamToString', async () => {
        const response = await publishModule.streamToString(
            fs.createReadStream(path.resolve(__dirname, 'publish.test.ts'))
        );
        expect(response).toContain("test('streamToString')");
    });

    test('handler should fail when cfn template cannot be parsed', async () => {
        jest.spyOn(publishModule, 'streamToString').mockReturnValue(
            Promise.resolve(fixtureDynamoDbCfnTemplateJunk)
        );
        s3Mock.on(ListObjectsCommand).resolves({
            Contents: [
                {
                    Key: 's3://test-bucket/template/package-test1',
                },
            ],
        });
        scMock.on(DescribeProductAsAdminCommand).rejects({
            name: 'ResourceNotFoundException',
        });

        const task = (): Promise<void> =>
            publishModule.handler(
                {
                    'CodePipeline.job': {
                        id: '',
                        data: {
                            actionConfiguration: {
                                configuration: {
                                    UserParameters:
                                        '{"CHANGED_PACKAGES":"W3sibmFtZSI6IkB2ZXItdGVzdC00LWNmbi9keW5hbW9kYmpzb24tcGF0dGVybiIsInZlcnNpb24iOiIxLjAuMiIsImxvY2F0aW9uIjoiL2NvZGVidWlsZC9vdXRwdXQvc3JjNTQ4NDI4MTQwL3NyYy9jb2Rlc3Rhci1jb25uZWN0aW9ucy5hcC1zb3V0aGVhc3QtMi5hbWF6b25hd3MuY29tL2dpdC1odHRwLzIyMjY2ODA3MDYxMS9hcC1zb3V0aGVhc3QtMi8zMmQxOGY4NS1jYzBhLTQyMDEtODc5Mi1mOWJiZGJlOTFkM2EvYXBqc2ItZW50ZXJwcmlzZS92ZXItdGVzdC00LWNmbi9wYWNrYWdlcy9keW5hbW9kYmpzb24ifSx7Im5hbWUiOiJAdmVyLXRlc3QtNC1jZm4vZHluYW1vZGJ5bWwtcGF0dGVybiIsInZlcnNpb24iOiIxLjAuMiIsImxvY2F0aW9uIjoiL2NvZGVidWlsZC9vdXRwdXQvc3JjNTQ4NDI4MTQwL3NyYy9jb2Rlc3Rhci1jb25uZWN0aW9ucy5hcC1zb3V0aGVhc3QtMi5hbWF6b25hd3MuY29tL2dpdC1odHRwLzIyMjY2ODA3MDYxMS9hcC1zb3V0aGVhc3QtMi8zMmQxOGY4NS1jYzBhLTQyMDEtODc5Mi1mOWJiZGJlOTFkM2EvYXBqc2ItZW50ZXJwcmlzZS92ZXItdGVzdC00LWNmbi9wYWNrYWdlcy9keW5hbW9kYnltbCJ9XQ==","ALL_PACKAGES":"W3sibmFtZSI6IkB2ZXItdGVzdC00LWNmbi9keW5hbW9kYmpzb24tcGF0dGVybiIsInZlcnNpb24iOiIxLjAuMyIsImxvY2F0aW9uIjoiL2NvZGVidWlsZC9vdXRwdXQvc3JjNTQ4NDI4MTQwL3NyYy9jb2Rlc3Rhci1jb25uZWN0aW9ucy5hcC1zb3V0aGVhc3QtMi5hbWF6b25hd3MuY29tL2dpdC1odHRwLzIyMjY2ODA3MDYxMS9hcC1zb3V0aGVhc3QtMi8zMmQxOGY4NS1jYzBhLTQyMDEtODc5Mi1mOWJiZGJlOTFkM2EvYXBqc2ItZW50ZXJwcmlzZS92ZXItdGVzdC00LWNmbi9wYWNrYWdlcy9keW5hbW9kYmpzb24ifSx7Im5hbWUiOiJAdmVyLXRlc3QtNC1jZm4vZHluYW1vZGJ5bWwtcGF0dGVybiIsInZlcnNpb24iOiIxLjAuMyIsImxvY2F0aW9uIjoiL2NvZGVidWlsZC9vdXRwdXQvc3JjNTQ4NDI4MTQwL3NyYy9jb2Rlc3Rhci1jb25uZWN0aW9ucy5hcC1zb3V0aGVhc3QtMi5hbWF6b25hd3MuY29tL2dpdC1odHRwLzIyMjY2ODA3MDYxMS9hcC1zb3V0aGVhc3QtMi8zMmQxOGY4NS1jYzBhLTQyMDEtODc5Mi1mOWJiZGJlOTFkM2EvYXBqc2ItZW50ZXJwcmlzZS92ZXItdGVzdC00LWNmbi9wYWNrYWdlcy9keW5hbW9kYnltbCJ9XQ==","TEMPLATES_ARTIFACTS_LOCATION":"ver-test-4-cfn/0f48c7fdce7eecf42f8efb4ac0b98013f7e695f7/templates"}',
                                },
                            },
                        },
                    },
                } as unknown as CodePipelineEvent,
                {} as Context
            );

        await expect(() => task()).rejects.toThrow();
    });

    test('createProduct should throw error when create product command fails', async () => {
        scMock.on(CreateProductCommand).rejects('InvalidParametersException');
        jest.spyOn(publishModule, 'streamToString').mockReturnValue(
            Promise.resolve(JSON.stringify(fixtureDynamoDbCfnTemplateJson))
        );
        await expect(async () => {
            await publishModule.createProduct(
                'package-test1',
                '1.1.1',
                'https://test.com/package-test1',
                'test description'
            );
        }).rejects.toThrowError('InvalidParametersException');
    });

    test('do nothing if user parameters is empty', async () => {
        jest.spyOn(publishModule, 'streamToString').mockReturnValue(
            Promise.resolve(JSON.stringify(fixtureDynamoDbCfnTemplateJson))
        );
        await publishModule.handler(
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
        jest.spyOn(publishModule, 'streamToString').mockReturnValue(
            Promise.resolve(JSON.stringify(fixtureDynamoDbCfnTemplateJson))
        );
        await publishModule.handler(
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
        expect(scMock.calls()).toHaveLength(0);
    });

    test('create a product if it does not already exist', async () => {
        jest.spyOn(publishModule, 'streamToString').mockReturnValue(
            Promise.resolve(fixtureDynamoDbCfnTemplateYml)
        );
        scMock.on(DescribeProductAsAdminCommand).rejects({
            name: 'ResourceNotFoundException',
        });
        scMock.on(CreateProductCommand).resolves({
            ProductViewDetail: { ProductViewSummary: { ProductId: '123' } },
            ProvisioningArtifactDetail: { Id: '123' },
        });
        s3Mock.on(ListObjectsCommand).resolves({
            Contents: [
                {
                    Key: 's3://test-bucket/template/package-test1',
                },
            ],
        });

        await publishModule.handler(
            {
                'CodePipeline.job': {
                    id: '',
                    data: {
                        actionConfiguration: {
                            configuration: {
                                UserParameters: JSON.stringify({
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
        expect(cloudFormationClientMock.calls()).toHaveLength(1);
        expect(s3Mock.calls()).toHaveLength(3);
        expect(scMock.calls()).toHaveLength(4);
        expect(scMock.call(0).firstArg).toBeInstanceOf(DescribeProductAsAdminCommand);
        expect(scMock.call(1).firstArg).toBeInstanceOf(CreateProductCommand);
        expect(scMock.call(2).firstArg).toBeInstanceOf(
            AssociateProductWithPortfolioCommand
        );
        expect(cpMock.calls()).toHaveLength(1);
        expect(cpMock.call(0).firstArg).toBeInstanceOf(PutJobSuccessResultCommand);

        expect(
            JSON.parse(
                Buffer.from(
                    cpMock.call(0).firstArg?.input?.outputVariables
                        ?.CHANGED_SERVICE_CATALOG_PRODUCTS,
                    'base64'
                ).toString()
            )
        ).toEqual([
            {
                name: `${BLUEPRINT_ID}_${TEMPLATE_NAME}`,
                productId: '123',
                provisioningArtifactId: '123',
                account: process.env.AWS_ACCOUNT,
                region: process.env.AWS_REGION,
            },
        ]);
    });

    test('should fail the pipeline when creating product fails', async () => {
        jest.spyOn(publishModule, 'streamToString').mockReturnValue(
            Promise.resolve(JSON.stringify(fixtureDynamoDbCfnTemplateJson))
        );
        scMock.on(DescribeProductAsAdminCommand).resolves({
            ProductViewDetail: { ProductViewSummary: { ProductId: '123' } },
        });
        scMock
            .on(CreateProvisioningArtifactCommand)
            .rejects('InvalidParametersException');
        s3Mock.on(ListObjectsCommand).resolves({
            Contents: [
                {
                    Key: 's3://test-bucket/template/package-test1',
                },
            ],
        });

        const task = (): Promise<void> =>
            publishModule.handler(
                {
                    'CodePipeline.job': {
                        id: '',
                        data: {
                            actionConfiguration: {
                                configuration: {
                                    UserParameters: JSON.stringify({
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
        expect(cpMock.calls()).toHaveLength(1);
        expect(cpMock.call(0).firstArg).toBeInstanceOf(PutJobFailureResultCommand);
    });

    test('create a product version if product already exists', async () => {
        jest.spyOn(publishModule, 'streamToString').mockReturnValue(
            Promise.resolve(JSON.stringify(fixtureDynamoDbCfnTemplateJson))
        );
        scMock.on(DescribeProductAsAdminCommand).resolves({
            ProductViewDetail: { ProductViewSummary: { ProductId: '123' } },
        });
        scMock.on(CreateProvisioningArtifactCommand).resolves({
            ProvisioningArtifactDetail: { Id: '123' },
        });
        s3Mock.on(ListObjectsCommand).resolves({
            Contents: [
                {
                    Key: 's3://test-bucket/template/package-test1',
                },
            ],
        });

        await publishModule.handler(
            {
                'CodePipeline.job': {
                    id: '',
                    data: {
                        actionConfiguration: {
                            configuration: {
                                UserParameters: JSON.stringify({
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
        expect(cloudFormationClientMock.calls()).toHaveLength(1);
        expect(scMock.calls()).toHaveLength(3);
        expect(scMock.call(1).firstArg).toBeInstanceOf(CreateProvisioningArtifactCommand);
        expect(s3Mock.calls()).toHaveLength(3);
        expect(cpMock.calls()).toHaveLength(1);
        expect(cpMock.call(0).firstArg).toBeInstanceOf(PutJobSuccessResultCommand);
        expect(
            JSON.parse(
                Buffer.from(
                    cpMock.call(0).firstArg?.input?.outputVariables
                        ?.CHANGED_SERVICE_CATALOG_PRODUCTS,
                    'base64'
                ).toString()
            )
        ).toEqual([
            {
                name: `${BLUEPRINT_ID}_${TEMPLATE_NAME}`,
                productId: '123',
                provisioningArtifactId: '123',
                account: process.env.AWS_ACCOUNT,
                region: process.env.AWS_REGION,
            },
        ]);
    });
});
