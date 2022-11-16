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
    ServiceCatalogClient,
    DescribeProductAsAdminCommand,
    CreateProductCommand,
    CreateProvisioningArtifactCommand,
    AssociateProductWithPortfolioCommand,
    ServiceOutputTypes,
    DescribeProductAsAdminCommandOutput,
    CreateProductCommandOutput,
    CreateProvisioningArtifactCommandOutput,
} from '@aws-sdk/client-service-catalog';
import {
    CodePipelineClient,
    PutJobSuccessResultCommand,
    PutJobFailureResultCommand,
} from '@aws-sdk/client-codepipeline';
import {
    BlueprintServiceCatalogProduct,
    NpmPackageDetails,
} from '../types/BlueprintTypes';
import {
    ListObjectsCommand,
    PutObjectCommand,
    GetObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { CodePipelineEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { StaticLoggerFactory } from '../../common/logger-factory';
import { awsSdkConfiguration } from '../../common/common-types';
import * as yaml from 'js-yaml';
import { CLOUDFORMATION_SCHEMA } from 'js-yaml-cloudformation-schema';
import {
    CloudFormationClient,
    ValidateTemplateCommand,
} from '@aws-sdk/client-cloudformation';
import * as publishModule from './publish';
import { Readable } from 'stream';
import { getPatternById } from './common';
import { LogLevelType } from '../../common/logger-type';

const AWS_ACCOUNT = process.env.AWS_ACCOUNT;
const AWS_REGION = process.env.AWS_REGION;
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as LogLevelType;
const BLUEPRINT_SERVICE_CATALOG_PORTFOLIO_ID =
    process.env.BLUEPRINT_SERVICE_CATALOG_PORTFOLIO_ID;
const SERVICE_CATALOG_PRODUCT_TYPE = 'CLOUD_FORMATION_TEMPLATE';
const SERVICE_CATALOG_OWNER = 'APO';

const serviceCatalogClient = new ServiceCatalogClient(awsSdkConfiguration);
const codepipelineClient = new CodePipelineClient(awsSdkConfiguration);

const s3Client = new S3Client(awsSdkConfiguration);
const cloudFormationClient = new CloudFormationClient(awsSdkConfiguration);
const ddbClient = new DynamoDBClient(awsSdkConfiguration);
const ddbDocClient = DynamoDBDocument.from(ddbClient, {
    marshallOptions: {
        // Remove undefined values while marshalling because some fields won't be set depending on blueprint type
        removeUndefinedValues: true,
    },
});

const logger = new StaticLoggerFactory().getLogger('PatternPublish', LOG_LEVEL);

const appNameAttrGroupAssociationTemplate = {
    Type: 'AWS::ServiceCatalogAppRegistry::AttributeGroupAssociation',
    Properties: {
        Application: {
            Ref: 'AppRegistryApplicationName',
        },
    },
};

const appRegistryApplicationNameParameter = {
    Description: 'AppRegistry Application Name',
    Type: 'String',
    AllowedPattern: '[a-zA-Z0-9]*',
    MinLength: '1',
    MaxLength: '2048',
    ConstraintDescription: 'must contain only alphanumberic characters',
};

export async function getProduct(name: string): Promise<ServiceOutputTypes | undefined> {
    try {
        return await serviceCatalogClient.send(
            new DescribeProductAsAdminCommand({
                Name: name,
            })
        );
    } catch (e) {
        logger.error(`Error in getProduct: ${JSON.stringify(e)}`);
        return undefined;
    }
}

export async function createProduct(
    name: string,
    version: string,
    templateUrl: string,
    description: string
): Promise<ServiceOutputTypes> {
    let product;
    try {
        product = await serviceCatalogClient.send(
            new CreateProductCommand({
                Name: name,
                Owner: SERVICE_CATALOG_OWNER,
                ProductType: SERVICE_CATALOG_PRODUCT_TYPE,
                Description: description,
                ProvisioningArtifactParameters: {
                    Name: version,
                    Info: {
                        LoadTemplateFromURL: templateUrl,
                    },
                    Type: SERVICE_CATALOG_PRODUCT_TYPE,
                },
            })
        );
        logger.info(`product created: ${JSON.stringify(product, null, 4)}`);
    } catch (err) {
        logger.error(`Error creating product: ${JSON.stringify(err)}`);
        throw err;
    }

    try {
        const attachmentResp = await serviceCatalogClient.send(
            new AssociateProductWithPortfolioCommand({
                PortfolioId: BLUEPRINT_SERVICE_CATALOG_PORTFOLIO_ID,
                ProductId: product.ProductViewDetail?.ProductViewSummary?.ProductId,
            })
        );
        logger.info(`Attached: ${JSON.stringify(attachmentResp)}`);
    } catch (err) {
        logger.error(`Error associating product with portfolio ${JSON.stringify(err)}`);
        throw err;
    }

    return product;
}

export async function createProvisioningArtifact(
    productId: string,
    version: string,
    templateUrl: string,
    description: string
): Promise<ServiceOutputTypes> {
    return serviceCatalogClient.send(
        new CreateProvisioningArtifactCommand({
            ProductId: productId,
            Parameters: {
                Name: version,
                Description: description,
                Info: {
                    LoadTemplateFromURL: templateUrl,
                },
                Type: SERVICE_CATALOG_PRODUCT_TYPE,
            },
        })
    );
}

/**
 * Validates Cloudformation template
 */
async function validateCfnTemplate(cfnTemplateStr: string): Promise<void> {
    const command = new ValidateTemplateCommand({
        TemplateBody: cfnTemplateStr,
    });
    try {
        const response = await cloudFormationClient.send(command);
        logger.debug(`Cfn validation response: ${JSON.stringify(response, null, 4)}`);
    } catch (e) {
        logger.error(`Cloudformation template failed validation: ${JSON.stringify(e)}`);
        throw e;
    }
}

export async function handler(event: CodePipelineEvent, context: Context): Promise<void> {
    logger.defaultMeta = { requestId: context.awsRequestId };

    const BLUEPRINT_ID = process.env.BLUEPRINT_ID ?? '';
    const BLUEPRINT_ARTIFACTS_BUCKET_NAME = process.env.BLUEPRINT_ARTIFACTS_BUCKET_NAME;
    const jobId = event['CodePipeline.job'].id;

    try {
        // Get the user parameters which contain the blueprint version infos
        const userParameters =
            event['CodePipeline.job'].data.actionConfiguration.configuration
                .UserParameters;
        logger.debug(`UserParameters: ${userParameters}`);

        const { CHANGED_PACKAGES, ALL_PACKAGES, TEMPLATES_ARTIFACTS_LOCATION } =
            JSON.parse(userParameters);

        const changedBlueprintProducts: BlueprintServiceCatalogProduct[] = [];
        let allBlueprintProducts: BlueprintServiceCatalogProduct[] = [];
        const changedPackagesParsed = CHANGED_PACKAGES
            ? JSON.parse(
                  // The products JSON is base 64 encoded by the publish handler
                  Buffer.from(CHANGED_PACKAGES, 'base64').toString()
              )
            : undefined;

        logger.info(
            'changedPackagesParsed: ' + JSON.stringify(changedPackagesParsed, null, 4)
        );

        const allPackagesParsed = ALL_PACKAGES
            ? JSON.parse(
                  // The products JSON is base 64 encoded by the publish handler
                  Buffer.from(ALL_PACKAGES, 'base64').toString()
              )
            : undefined;

        logger.info('allPackagesParsed: ' + JSON.stringify(allPackagesParsed, null, 4));

        let changedPackagesOutputVariable = '';
        let allPackagesOutputVariable = '';

        if (changedPackagesParsed) {
            const changedPackagesParsedSyncVersions = changedPackagesParsed.map(
                (changedPackagesItem: NpmPackageDetails) => ({
                    name: changedPackagesItem.name,
                    version: allPackagesParsed.find(
                        (allPackagesItem: NpmPackageDetails) =>
                            allPackagesItem.name === changedPackagesItem.name
                    ).version,
                    location: changedPackagesItem.location,
                })
            );

            for (const npmPackage of changedPackagesParsedSyncVersions) {
                logger.info(
                    `Creating new version ${npmPackage.version} from template in package ${npmPackage.name}`
                );
                const templatePathFromPackages = npmPackage.location.substring(
                    npmPackage.location.lastIndexOf('/packages')
                );

                const s3GetObjResp = await s3Client.send(
                    new ListObjectsCommand({
                        Bucket: `${BLUEPRINT_ARTIFACTS_BUCKET_NAME}`,
                        MaxKeys: 1,
                        Prefix: `${TEMPLATES_ARTIFACTS_LOCATION}${templatePathFromPackages}/template/`,
                    })
                );
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const s3GetObjKey = s3GetObjResp.Contents![0].Key!;
                const s3CfnTemplateFileName = s3GetObjKey.substring(
                    s3GetObjKey.lastIndexOf('/template')
                );
                const templateS3ObjectKey = `${TEMPLATES_ARTIFACTS_LOCATION}${templatePathFromPackages}${s3CfnTemplateFileName}`;
                const templateUrl = `https://${BLUEPRINT_ARTIFACTS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${templateS3ObjectKey}`;
                const productName = `${BLUEPRINT_ID}_${npmPackage.name}`;
                const patternDetails = await getPatternById(ddbDocClient, BLUEPRINT_ID);
                // If pattern is associated with attributes, embed it into the Cfn template
                if (patternDetails?.attributes) {
                    await embedAttributeGroupMapping(
                        patternDetails.attributes,
                        BLUEPRINT_ARTIFACTS_BUCKET_NAME as string,
                        templateS3ObjectKey
                    );
                }
                const product: DescribeProductAsAdminCommandOutput | undefined =
                    await getProduct(productName);

                if (product?.ProductViewDetail?.ProductViewSummary?.ProductId) {
                    logger.info(
                        'Product already exists in service catalog, creating a new version'
                    );

                    const result = (await createProvisioningArtifact(
                        product.ProductViewDetail.ProductViewSummary.ProductId,
                        npmPackage.version,
                        templateUrl,
                        patternDetails?.description
                    )) as CreateProvisioningArtifactCommandOutput;
                    changedBlueprintProducts.push({
                        name: productName,
                        account: AWS_ACCOUNT,
                        region: AWS_REGION,
                        productId: product.ProductViewDetail.ProductViewSummary.ProductId,
                        provisioningArtifactId: result.ProvisioningArtifactDetail?.Id,
                    });
                } else {
                    logger.info("Product doesn't exist in service catalog, creating it");
                    const result = (await createProduct(
                        productName,
                        npmPackage.version,
                        templateUrl,
                        patternDetails?.description
                    )) as CreateProductCommandOutput;

                    changedBlueprintProducts.push({
                        name: productName,
                        account: AWS_ACCOUNT,
                        region: AWS_REGION,
                        productId:
                            result.ProductViewDetail?.ProductViewSummary?.ProductId,
                        provisioningArtifactId: result.ProvisioningArtifactDetail?.Id,
                    });
                }
            }
            changedPackagesOutputVariable = Buffer.from(
                JSON.stringify(
                    changedPackagesParsedSyncVersions.map((item: NpmPackageDetails) => ({
                        name: item.name,
                        version: item.version,
                    }))
                )
            ).toString('base64');
            allPackagesOutputVariable = allPackagesParsed
                ? Buffer.from(
                      JSON.stringify(
                          allPackagesParsed.map((item: NpmPackageDetails) => ({
                              name: item.name,
                              version: item.version,
                          }))
                      )
                  ).toString('base64')
                : '';

            const unchangedPackages = allPackagesParsed.filter(
                (arr1Obj: NpmPackageDetails) =>
                    !changedPackagesParsed.some(
                        (arr2Obj: NpmPackageDetails) => arr1Obj.name === arr2Obj.name
                    )
            );
            allBlueprintProducts = [...changedBlueprintProducts];
            for (const unchangedPackage of unchangedPackages) {
                const productName = `${BLUEPRINT_ID}_${unchangedPackage.name}`;
                const product: DescribeProductAsAdminCommandOutput | undefined =
                    await getProduct(productName);
                allBlueprintProducts.push({
                    name: productName,
                    account: AWS_ACCOUNT,
                    region: AWS_REGION,
                    productId: product?.ProductViewDetail?.ProductViewSummary?.ProductId,
                    provisioningArtifactId:
                        product?.ProvisioningArtifactSummaries?.[0].Id,
                });
            }
        }

        await codepipelineClient.send(
            new PutJobSuccessResultCommand({
                jobId,
                outputVariables: {
                    // Need to base 64 encode the below json strings because output variables get JSON encoded
                    CHANGED_SERVICE_CATALOG_PRODUCTS: Buffer.from(
                        JSON.stringify(changedBlueprintProducts)
                    ).toString('base64'),
                    ALL_SERVICE_CATALOG_PRODUCTS: Buffer.from(
                        JSON.stringify(allBlueprintProducts)
                    ).toString('base64'),
                    CHANGED_PACKAGES: changedPackagesOutputVariable,
                    ALL_PACKAGES: allPackagesOutputVariable,
                },
            })
        );
    } catch (e) {
        logger.error(`Error: ${JSON.stringify(e)}`);
        await codepipelineClient.send(
            new PutJobFailureResultCommand({
                jobId,
                failureDetails: {
                    message: 'e.message',
                    type: 'JobFailed',
                    externalExecutionId: context.awsRequestId,
                },
            })
        );
        throw e;
    }
}

export function streamToString(stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf8'));
        });
    });
}

// Embeds pattern attributes in Cloudformation templates,validates and replaces the original tempplate
async function embedAttributeGroupMapping(
    patternAttributes: Record<string, string>,
    blueprintArtifactsBucketName: string,
    s3CfnObjectKey: string
): Promise<void> {
    const attributeGroupNames = Object.entries(patternAttributes).map(
        ([key, value]) => `APO.${key.toUpperCase()}.${value.toUpperCase()}`
    );
    const bucketParams = {
        Bucket: blueprintArtifactsBucketName,
        Key: s3CfnObjectKey,
    };
    const response = await s3Client.send(new GetObjectCommand(bucketParams));
    const templateContent = await publishModule.streamToString(response.Body as Readable);
    let templateContentParsed;

    try {
        templateContentParsed = JSON.parse(templateContent);
    } catch (e) {
        try {
            templateContentParsed = yaml.load(templateContent, {
                schema: CLOUDFORMATION_SCHEMA,
            });
        } catch (e) {
            logger.error(
                `Unable to parse the cloudformation template : ${blueprintArtifactsBucketName}, ${s3CfnObjectKey}, error: ${JSON.stringify(
                    e
                )}`
            );
            throw e;
        }
    }

    // If Parameters attribute doesn't exist create it
    if (!('Parameters' in templateContentParsed)) {
        templateContentParsed['Parameters'] = {};
    }

    templateContentParsed['Parameters']['AppRegistryApplicationName'] =
        appRegistryApplicationNameParameter;
    // associate attribute groups from appRegistry
    for (const attributeGroupName of attributeGroupNames) {
        const attrGroupAssociationProps = {
            ...appNameAttrGroupAssociationTemplate['Properties'],
            AttributeGroup: attributeGroupName,
        };
        const appNameAttrGroupAssociation = {
            ...appNameAttrGroupAssociationTemplate,
            Properties: attrGroupAssociationProps,
        };
        // If Resources doesn't exist create it
        if (!('Resources' in templateContentParsed)) {
            templateContentParsed['Resources'] = {};
        }
        templateContentParsed['Resources'][attributeGroupName.replace(/\./g, '')] =
            appNameAttrGroupAssociation;
    }
    // remove AWSTemplateFormatVersion as it optional anyway and creates invalid date format when converting from Yaml to Json
    if (templateContentParsed['AWSTemplateFormatVersion']) {
        delete templateContentParsed['AWSTemplateFormatVersion'];
    }
    const finalCfnTemplate = JSON.stringify(templateContentParsed, null, 4);
    // validate Cloudformation template
    await validateCfnTemplate(finalCfnTemplate);
    // replace previous cfn template with added embedded attributes mapping
    await s3Client.send(
        new PutObjectCommand({
            Bucket: blueprintArtifactsBucketName,
            Key: s3CfnObjectKey,
            Body: finalCfnTemplate,
        })
    );
}
