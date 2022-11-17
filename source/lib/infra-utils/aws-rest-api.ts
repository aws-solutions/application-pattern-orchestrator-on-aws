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

import { Aspects, Aws, aws_wafv2, IAspect, RemovalPolicy } from 'aws-cdk-lib';
import {
    AccessLogFormat,
    AuthorizationType,
    CfnAuthorizer,
    CfnMethod,
    Cors,
    EndpointConfiguration,
    EndpointType,
    LambdaIntegration,
    LambdaRestApi,
    LogGroupLogDestination,
    Method,
    MethodOptions,
    ProxyResource,
    Resource,
    ResponseType,
    RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { IVpcEndpoint } from 'aws-cdk-lib/aws-ec2';
import { Version, Alias, IFunction } from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct, IConstruct } from 'constructs';
import { addCfnNagSuppression } from '../cfn-nag-suppression';
import { AWSLambdaFunction } from './aws-lambda-function';
import { NagSuppressions } from 'cdk-nag';

export interface AWSRestApiProps {
    cognitoUserPoolArn: string;
    /**
     * A Lambda Function to handle API Request
     */
    lambdaFunction: AWSLambdaFunction;
    /**
     * A list of AWS Role names that allow access to this API.
     *
     * AWS Role names are specified in a user attribute in external Identity Provider. The AGSRole
     * name in this allow list is granted the access.
     *
     * Valid value is `/^([a-zA-Z0-9\-_]*|\*)$/`. Either a name made of upper/lower case letters, hypen,
     * underscore, or a single astreroid (*) to allow ALL.
     */
    allowedExternalUserAWSRoleNames: string[];
    /**
     * A list of AWS Service Names that allow access to this API.
     *
     * This is to control which AWS Service can access to this API.
     *
     * Valid value is `/^([a-zA-Z0-9\-_]*|\*)$/`. Either a name made of upper/lower case letters, hypen,
     * underscore, or a single astreroid (*) to allow ALL.
     *
     * @default * - allow ALL access
     */
    allowedServiceNames?: string[];
    /**
     *
     * Indicate whether or not proxy all requests to the default lambda handler
     *
     * If true, route all requests to the Lambda Function.
     *
     * If set to false, you will need to explicitly define the API model using
     * `addResource` and `addMethod` (or `addProxy`).
     *
     * @default true
     */
    enableProxyAll?: boolean;
    /**
     *
     * Indicate whether or not use lambda alias
     *
     * If true, create lambda alias as API gateway target
     *
     *
     * @default false
     */
    enableAlias?: boolean;
    /**
     * Allow invoking method from AWS Console UI (for testing purposes).
     *
     * This will add another permission to the AWS Lambda resource policy which
     * will allow the `test-invoke-stage` stage to invoke this handler. If this
     * is set to `false`, the function will only be usable from the deployment
     * endpoint.
     *
     * @default true
     */
    allowTestInvoke?: boolean;

    /**
     * The list of binary media mime-types that are supported by the RestApi resource, such as "image/png" or "application/octet-stream".
     *
     * @default - RestApi supports only UTF-8-encoded text payloads.
     * @stability stable
     */
    readonly binaryMediaTypes?: string[];

    apiGatewayType: string;

    apigatewayVpcEndpoint: IVpcEndpoint;

    serviceName: string;

    apiGatewayWebAclArn?: string;
    removalPolicy: RemovalPolicy;
}

export class AWSRestApi extends Construct {
    public readonly api: LambdaRestApi;
    public readonly versionAlias: Alias;
    public readonly apiUrl: string;
    public methodProps: MethodOptions;

    public constructor(scope: Construct, id: string, props: AWSRestApiProps) {
        super(scope, id);

        // Check ApiGateway type to decide if use VpcEndpoint
        const useVpcEndpoint = props.apiGatewayType === 'private';

        // compose VpcEndpoint setting
        let endpointConfig: EndpointConfiguration = {
            types: [EndpointType.EDGE],
            vpcEndpoints: undefined,
        };

        if (useVpcEndpoint) {
            endpointConfig = {
                types: [EndpointType.PRIVATE],
                vpcEndpoints: [props.apigatewayVpcEndpoint],
            };
        }
        const version = new Version(this, 'version', {
            lambda: props.lambdaFunction.lambdaFunction,
        });
        // const version = props.lambdaFunction.lambdaFunction.latestVersion;

        this.versionAlias = new Alias(this, 'alias', {
            aliasName: 'prod',
            version: version,
        });

        const gwTarget: IFunction = props.enableAlias
            ? this.versionAlias
            : props.lambdaFunction.lambdaFunction;

        const apiGatewayAccessLogs = new LogGroup(this, 'ApiGatewayAccessLogs', {
            removalPolicy: props.removalPolicy,
        });
        addCfnNagSuppression(apiGatewayAccessLogs, [
            {
                id: 'W84',
                reason: 'By default, loggroup is encrypted with default master key https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroup.html',
            },
        ]);

        this.api = new RestApi(this, `API`, {
            description: `Rest Api for ${props.serviceName}`,
            defaultIntegration: new LambdaIntegration(gwTarget, {
                proxy: true, //lambda proxy should be always on
                allowTestInvoke: props.allowTestInvoke,
            }),
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS,
            },
            defaultMethodOptions: {
                authorizationType: AuthorizationType.IAM,
            },
            binaryMediaTypes: props.binaryMediaTypes,
            endpointConfiguration: endpointConfig,
            deployOptions: {
                metricsEnabled: true,
                tracingEnabled: true,
                accessLogDestination: new LogGroupLogDestination(apiGatewayAccessLogs),
                accessLogFormat: AccessLogFormat.clf(),
            },
            restApiName: `${props.serviceName}-API`,
        });
        NagSuppressions.addResourceSuppressions(
            this.api.deploymentStage,
            [
                {
                    id: 'AwsSolutions-APIG6',
                    reason: 'Its a false positive.',
                },
            ],
            true
        );
        NagSuppressions.addResourceSuppressions(
            this.api,
            [
                {
                    id: 'AwsSolutions-IAM4',
                    reason: 'CloudWatchRole needs managed policy AmazonAPIGatewayPushToCloudWatchLogs',
                },
            ],
            true
        );

        const authorizer = new CfnAuthorizer(scope, 'CognitoAuth', {
            type: AuthorizationType.COGNITO,
            name: 'cognito-authorizer',
            restApiId: this.api.restApiId,
            providerArns: [props.cognitoUserPoolArn],
            identitySource: 'method.request.header.Authorization',
        });

        this.methodProps = {
            authorizationType: AuthorizationType.COGNITO,
            authorizer: { authorizerId: authorizer.ref },
            apiKeyRequired: false,
        };

        // add CORS header to APIGateway Default 4xx and 5xx responses
        // so that browser can receive the status code and error message
        this.api.addGatewayResponse('default-4xx', {
            type: ResponseType.DEFAULT_4XX,
            responseHeaders: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'access-control-allow-origin': `'*'`,
            },
        });

        this.api.addGatewayResponse('default-5xx', {
            type: ResponseType.DEFAULT_5XX,
            responseHeaders: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'access-control-allow-origin': `'*'`,
            },
        });

        NagSuppressions.addResourceSuppressions(
            this.api,
            [
                {
                    id: 'AwsSolutions-APIG2',
                    reason: 'The REST API does not have request validation enabled - This is configured at Lambda layer level',
                },
            ],
            true
        );

        if (props.enableProxyAll !== false) {
            this.api.root.addProxy();

            // Make sure users cannot call any other resource adding function
            this.api.root.addResource = addResourceThrows;
            this.api.root.addMethod = addMethodThrows;
            this.api.root.addProxy = addProxyThrows;
        }

        // Set OPTIONS method with NONE authentication for browser to access.
        // Based on W3 spec, CORS-preflight request never includes credentials.
        // https://fetch.spec.whatwg.org/#cors-protocol-and-credentials
        Aspects.of(this.api).add(new OptionMethodNoAuth());

        // associate WAF WebACL to APIGateway if WebACL ARN is specified
        if (props.apiGatewayWebAclArn?.startsWith('arn:aws:wafv2', 0)) {
            const webACLAssociation = new aws_wafv2.CfnWebACLAssociation(
                this,
                'WebACLAssociation',
                {
                    resourceArn: `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}::/restapis/${this.api.restApiId}/stages/prod`,
                    webAclArn: props.apiGatewayWebAclArn,
                }
            );
            webACLAssociation.node.addDependency(this.api);
        }

        // ssm parameter for ApiGateway Endpoint URL
        this.apiUrl = useVpcEndpoint
            ? `https://${this.api.restApiId}-${props.apigatewayVpcEndpoint.vpcEndpointId}.execute-api.${Aws.REGION}.${Aws.URL_SUFFIX}/${this.api.deploymentStage.stageName}/`
            : this.api.url;

        new StringParameter(this, 'ApiUrl', {
            parameterName: `/rapm/endpoints/${props.serviceName}`,
            stringValue: this.apiUrl,
        });

        new StringParameter(this, 'ApiHost', {
            parameterName: `/rapm/hostnames/${props.serviceName}`,
            stringValue: `${this.api.restApiId}.execute-api.${Aws.REGION}.${Aws.URL_SUFFIX}`,
        });
    }
}

function addResourceThrows(): Resource {
    throw new Error(
        "Cannot call 'addResource' on a proxying AGSRestApi; set 'enableProxyAll' to false"
    );
}

function addMethodThrows(): Method {
    throw new Error(
        "Cannot call 'addMethod' on a proxying AGSRestApi; set 'enableProxyAll' to false"
    );
}

function addProxyThrows(): ProxyResource {
    throw new Error(
        "Cannot call 'addProxy' on a proxying AGSRestApi; set 'enableProxyAll' to false"
    );
}

export class OptionMethodNoAuth implements IAspect {
    public visit(node: IConstruct): void {
        if (node instanceof CfnMethod && node.httpMethod === 'OPTIONS') {
            node.addPropertyOverride('AuthorizationType', AuthorizationType.NONE);
        }
    }
}
