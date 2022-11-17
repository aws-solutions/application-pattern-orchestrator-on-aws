#!/usr/bin/env node
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
import 'source-map-support/register';
import { App, Aspects, DefaultStackSynthesizer, RemovalPolicy } from 'aws-cdk-lib';
import {
    CfnNagCustomResourceSuppressionAspect,
    CfnNagServiceRoleDefaultPolicyResourceSuppressionAspect,
} from '../lib/cfn-nag-suppression';
import { BlueprintStack } from '../lib/blueprint-stack';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { WafInfo, LogLevelType } from '../lib/blueprint-types';
import { AppRegistry } from '../lib/app-registry-aspect';

const app = new App();

const solutionId = process.env['SOLUTION_ID'] || 'SO0178';
const solutionName =
    process.env['SOLUTION_NAME'] || 'Application Pattern Orchestrator on AWS';
const solutionVersion = process.env['SOLUTION_VERSION'] || 'v1.0.0';
const solutionTradeMarkName =
    process.env['SOLUTION_TRADEMARKEDNAME'] || 'application-pattern-orchestrator-on-aws';

const customUserAgent = `AwsSolution/${solutionId}/${solutionVersion}`;

const vpcCidr = app.node.tryGetContext('vpcCidr');
const githubDomain = app.node.tryGetContext('githubDomain');
const githubDomainResolverIpAddresses = app.node.tryGetContext(
    'githubDomainResolverIpAddresses'
);

const githubTokenSecretId =
    app.node.tryGetContext('githubTokenSecretId') ?? 'githubTokenSecretId';
const githubConnectionArnSsmParam =
    app.node.tryGetContext('githubConnectionArnSsmParam') ?? 'githubConnectionArn';

const cognitoDomainPrefix = app.node.tryGetContext('cognitoDomainPrefix');
const identityProviderInfo = app.node.tryGetContext('identityProviderInfo');
const wafInfo: WafInfo = app.node.tryGetContext('wafInfo');
const removalPolicy = app.node.tryGetContext('retainData')
    ? RemovalPolicy.RETAIN
    : RemovalPolicy.DESTROY;
// Default log level is info if not specified
const logLevel: LogLevelType = app.node.tryGetContext('logLevel') || 'info';

const stackName = 'ApoStack';

const blueprintStack = new BlueprintStack(app, {
    synthesizer: new DefaultStackSynthesizer({
        generateBootstrapVersionRule: false,
    }),
    description: `(${solutionId}-${stackName}) - ${solutionName}. Version ${solutionVersion}`,
    solutionId,
    solutionName,
    solutionTradeMarkName,
    solutionVersion,
    vpcCidr,
    githubTokenSecretId,
    githubConnectionArnSsmParam,
    githubDomain,
    githubDomainResolverIpAddresses,
    customUserAgent,
    cognitoDomainPrefix,
    identityProviderInfo,
    wafInfo,
    removalPolicy,
    logLevel,
});

Aspects.of(app).add(new AwsSolutionsChecks());

// Register with Service catalogue app registry
Aspects.of(app).add(
    new AppRegistry(blueprintStack, 'appregistry-aspect', {
        solutionId,
        solutionVersion,
        solutionName,
        applicationType: 'AWS-Solutions',
        applicationName: 'Application-Pattern-Orchestrator-on-AWS',
    })
);

// CFk Nag suppression for UpdateBlueprintInfrastructureProjectRole default policy
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/BlueprintInfrastructureSetup/UpdateBlueprintInfrastructureProjectRole/DefaultPolicy/Resource',
    [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'The IAM permission has wildcard attached as suffix to specific permission.',
        },
    ],
    true
);

// CFk Nag suppression for BlueprintArtifactsApiRole default policy
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/RapmBackend/artifact-api-definition/BlueprintArtifactsApiRole/DefaultPolicy/Resource',
    [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'The IAM permission has wildcard attached as suffix to specific permission.',
        },
    ],
    true
);

// CFk Nag suppression for CDKBucketDeployment service role
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/ServiceRole/Resource',
    [
        {
            id: 'AwsSolutions-IAM4',
            reason: 'Needs managed policy AWSLambdaBasicExecutionRole',
        },
    ],
    true
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/ServiceRole/DefaultPolicy/Resource',
    [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'The IAM permission has wildcard attached as suffix to specific permission.',
        },
    ],
    true
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C3008MiB/ServiceRole/Resource',
    [
        {
            id: 'AwsSolutions-IAM4',
            reason: 'Needs managed policy AWSLambdaBasicExecutionRole',
        },
    ],
    true
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C3008MiB/ServiceRole/DefaultPolicy/Resource',
    [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'The IAM permission has wildcard attached as suffix to specific permission.',
        },
    ],
    true
);

// CFk Nag suppression for LogRetention default policy
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/Resource',
    [
        {
            id: 'AwsSolutions-IAM4',
            reason: 'Needs managed policy AWSLambdaBasicExecutionRole.',
        },
    ],
    true
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource',
    [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'Autogenerated by CDK.',
        },
    ],
    true
);

// CFk Nag suppression for UpdateBlueprintInfraStatusLambda default policy
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/BlueprintInfrastructureSetup/UpdateBlueprintInfraStatusLambda/ServiceRole/DefaultPolicy/Resource',
    [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'The IAM permission has wildcard attached as suffix to specific permission.',
        },
    ],
    true
);

// CDK Nag CloudFront Distribution Suppression
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmFrontend/CloudFrontDistribution/CFDistribution',
    [
        {
            id: 'AwsSolutions-CFR2',
            reason: 'The solution supports importing existing WAF for CloudFront distribution',
        },
        {
            id: 'AwsSolutions-CFR1',
            reason: 'This is subject to customer using geo specific restriction',
        },
        {
            id: 'AwsSolutions-CFR4',
            reason: 'This is subject to customer and it uses Cloudfront certificates',
        },
    ],
    true
);

// CDK Nag API Gateway suppressions
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/RapmBackend/Api/API/Default/patterns/OPTIONS/Resource',
    [
        {
            id: 'AwsSolutions-APIG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
        {
            id: 'AwsSolutions-COG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
    ]
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/RapmBackend/Api/API/Default/patterns/pipeline/OPTIONS/Resource',
    [
        {
            id: 'AwsSolutions-APIG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
        {
            id: 'AwsSolutions-COG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
    ]
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/RapmBackend/Api/API/Default/patterns/pipeline/{id}/OPTIONS/Resource',
    [
        {
            id: 'AwsSolutions-APIG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
        {
            id: 'AwsSolutions-COG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
    ]
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/RapmBackend/Api/API/Default/patterns/{id}/OPTIONS/Resource',
    [
        {
            id: 'AwsSolutions-APIG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
        {
            id: 'AwsSolutions-COG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
    ]
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/RapmBackend/Api/API/Default/attributes/OPTIONS/Resource',
    [
        {
            id: 'AwsSolutions-APIG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
        {
            id: 'AwsSolutions-COG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
    ]
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/RapmBackend/Api/API/Default/attributes/{id}/OPTIONS/Resource',
    [
        {
            id: 'AwsSolutions-APIG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
        {
            id: 'AwsSolutions-COG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
    ]
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/RapmBackend/Api/API/Default/subscriptions/OPTIONS/Resource',
    [
        {
            id: 'AwsSolutions-APIG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
        {
            id: 'AwsSolutions-COG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
    ]
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/RapmBackend/Api/API/Default/artifacts/OPTIONS/Resource',
    [
        {
            id: 'AwsSolutions-APIG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
        {
            id: 'AwsSolutions-COG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
    ]
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/RapmBackend/Api/API/Default/artifacts/{file}/OPTIONS/Resource',
    [
        {
            id: 'AwsSolutions-APIG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
        {
            id: 'AwsSolutions-COG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
    ]
);
NagSuppressions.addResourceSuppressionsByPath(
    blueprintStack,
    '/ApoStack/RapmBackend/RapmBackend/Api/API/Default/OPTIONS/Resource',
    [
        {
            id: 'AwsSolutions-APIG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
        {
            id: 'AwsSolutions-COG4',
            reason: 'API Gateway OPTIONS method is created implicitly by CDK',
        },
    ]
);

// CfnNag suppressions
Aspects.of(app).add(new CfnNagCustomResourceSuppressionAspect());
Aspects.of(app).add(new CfnNagServiceRoleDefaultPolicyResourceSuppressionAspect());
