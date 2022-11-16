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
import { container } from 'tsyringe';
import { BlueprintDBService } from '../service/BlueprintDBService';
import { AppConfiguration } from './configuration/AppConfiguration';
import { LoggerFactory, StaticLoggerFactory } from './logging';
import AWS, { ConfigurationOptions, EnvironmentCredentials } from 'aws-sdk';
import { Logger } from './logging/logger-type';
import { customUserAgentString } from './customUserAgent';

// register the global object in this file
const appConfiguration = new AppConfiguration('BlueprintService');

const credentialProviderChain = new AWS.CredentialProviderChain();
credentialProviderChain.providers.push(new EnvironmentCredentials('AWS'));

const configuration: ConfigurationOptions = {
    credentialProvider: credentialProviderChain,
    customUserAgent: customUserAgentString,
};

// register global configure
container.register<AppConfiguration>('AppConfiguration', {
    useValue: appConfiguration,
});

container.register<LoggerFactory>('LoggerFactory', {
    useClass: StaticLoggerFactory,
});

container.register<AWS.DynamoDB.DocumentClient>('DocumentClient', {
    useValue: new AWS.DynamoDB.DocumentClient(configuration),
});

container.register<BlueprintDBService>('BlueprintDBService', {
    useClass: BlueprintDBService,
});

// get logger
export function getLogger(name: string): Logger {
    return container
        .resolve<LoggerFactory>('LoggerFactory')
        .getLogger(name, appConfiguration.logLevel);
}
