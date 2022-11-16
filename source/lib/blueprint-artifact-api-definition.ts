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
import { AwsIntegration, MethodOptions, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface BlueprintArtifactApiDefinitionProps {
    blueprintApiGateway: RestApi;
    blueprintArtifactsBucket: IBucket;
    methodProps: MethodOptions;
}

/**
 * Artifacts API used on the web client to get an artifact from the artifact S3 bucket
 */
export class BlueprintArtifactApiDefinition extends Construct {
    public constructor(
        scope: Construct,
        id: string,
        props: BlueprintArtifactApiDefinitionProps
    ) {
        super(scope, id);

        const blueprintArtifactsApiRole = new Role(this, 'BlueprintArtifactsApiRole', {
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
            path: '/service-role/',
        });

        props.blueprintArtifactsBucket.grantRead(blueprintArtifactsApiRole);

        const corsResponseParameters = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'method.response.header.Access-Control-Allow-Headers':
                "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET'",
        };
        const s3Integration = new AwsIntegration({
            service: 's3',
            integrationHttpMethod: 'GET',
            path: `${props.blueprintArtifactsBucket.bucketName}/{file}`,
            options: {
                credentialsRole: blueprintArtifactsApiRole,
                requestParameters: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'integration.request.path.file': 'method.request.path.file',
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: corsResponseParameters,
                    },
                    {
                        statusCode: '400',
                        selectionPattern: '4\\d{2}',
                        responseParameters: corsResponseParameters,
                    },
                    {
                        statusCode: '500',
                        selectionPattern: '5\\d{2}',
                        responseParameters: corsResponseParameters,
                    },
                ],
            },
        });

        const sentResponseParameters = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'method.response.header.Content-Type': true,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'method.response.header.Access-Control-Allow-Origin': true,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'method.response.header.Access-Control-Allow-Methods': true,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'method.response.header.Access-Control-Allow-Headers': true,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'method.response.header.Timestamp': true,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'method.response.header.Content-Length': true,
        };
        props.blueprintApiGateway.root
            .addResource('artifacts')
            .addResource('{file}')
            .addMethod('GET', s3Integration, {
                apiKeyRequired: false,
                authorizationType: props.methodProps.authorizationType,
                authorizer: props.methodProps.authorizer,
                methodResponses: [
                    {
                        statusCode: '200',
                        responseParameters: sentResponseParameters,
                    },
                    {
                        statusCode: '400',
                        responseParameters: sentResponseParameters,
                    },
                    {
                        statusCode: '500',
                        responseParameters: sentResponseParameters,
                    },
                ],
                requestParameters: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'method.request.path.file': true,
                },
            });
    }
}
