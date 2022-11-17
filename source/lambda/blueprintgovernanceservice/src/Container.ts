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

import 'reflect-metadata';
import AWS, {
    ConfigurationOptions,
    EnvironmentCredentials,
    SecretsManager,
} from 'aws-sdk';
import AWSXRay from 'aws-xray-sdk';
import { CreateBlueprintRequestHandler } from './handlers/CreateBlueprintRequestHandler';
import { GetAllBlueprintsRequestHandler } from './handlers/GetAllBlueprintsRequestHandler';
import { container } from 'tsyringe';
import { ServerlessResponse } from './common/ServerlessResponse';
import { Router } from './common/router/Router';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as url from 'whatwg-url';
import { AppConfiguration } from './common/configuration/AppConfiguration';
import { GetBlueprintInfoHandler } from './handlers/GetBlueprintInfoHandler';
import { BlueprintRepoBuilderService } from './service/BlueprintRepoBuilderService';
import { CodeBuildClient } from '@aws-sdk/client-codebuild';
import { BlueprintPipelineBuilderService } from './service/BlueprintPipelineBuilderService';
import { DependencyConfigurationProvider } from './common/providers/DependencyConfigurationProvider';
import { InitialiseBlueprintPipelineHandler } from './handlers/InitialiseBlueprintPipelineHandler';
import { customUserAgentString, customUserAgentV3 } from './common/customUserAgent';
AWS.config.logger = console;

export function setupContainer(router: Router<ServerlessResponse>): void {
    // request handlers
    container.register<Router<ServerlessResponse>>(Router, { useValue: router });
    const appConfiguration = container.resolve<AppConfiguration>('AppConfiguration');

    const credentialProviderChain = new AWS.CredentialProviderChain();
    credentialProviderChain.providers.push(new EnvironmentCredentials('AWS'));

    const configuration: ConfigurationOptions = {
        credentialProvider: credentialProviderChain,
        customUserAgent: customUserAgentString,
    };

    container.register<DependencyConfigurationProvider>(
        'DependencyConfigurationProvider',
        {
            useClass: DependencyConfigurationProvider,
        }
    );

    container.register<AWS.S3>('S3', {
        useValue: new AWS.S3(configuration),
    });

    container.register<CodeBuildClient>('CodeBuildClient', {
        useValue: AWSXRay.captureAWSv3Client(
            new CodeBuildClient({
                region: appConfiguration.region,
                customUserAgent: customUserAgentV3,
            })
        ),
    });

    container.register<AWS.SSM>('SSM', { useValue: new AWS.SSM(configuration) });

    container.register<SecretsManager>('SecretsManager', {
        useValue: new AWS.SecretsManager(configuration),
    });

    container.register<AWS.APIGateway>('APIGateway', {
        useValue: new AWS.APIGateway({
            ...configuration,
            httpOptions: appConfiguration.proxyUri
                ? {
                      agent: new HttpsProxyAgent({
                          host: url.parseURL(appConfiguration.proxyUri)?.host?.toString(),
                          port: url.parseURL(appConfiguration.proxyUri)?.port,
                      }),
                  }
                : undefined,
        }),
    });
    container.register<CreateBlueprintRequestHandler>('CreateBlueprintRequestHandler', {
        useClass: CreateBlueprintRequestHandler,
    });
    container.register<GetAllBlueprintsRequestHandler>('GetAllBlueprintsRequestHandler', {
        useClass: GetAllBlueprintsRequestHandler,
    });
    container.register<GetBlueprintInfoHandler>('GetBlueprintInfoHandler', {
        useClass: GetBlueprintInfoHandler,
    });

    container.register<BlueprintRepoBuilderService>('BlueprintRepoBuilderService', {
        useClass: BlueprintRepoBuilderService,
    });

    container.register<BlueprintPipelineBuilderService>(
        'BlueprintPipelineBuilderService',
        {
            useClass: BlueprintPipelineBuilderService,
        }
    );

    container.register<InitialiseBlueprintPipelineHandler>(
        'InitialiseBlueprintPipelineHandler',
        {
            useClass: InitialiseBlueprintPipelineHandler,
        }
    );
}
