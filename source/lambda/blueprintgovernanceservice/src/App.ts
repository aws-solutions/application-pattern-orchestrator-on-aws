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
import './common/BaseContainer';
import { Router } from './common/router/Router';
import { setupContainer } from './Container';
import { CreateBlueprintRequestHandler } from './handlers/CreateBlueprintRequestHandler';
import { GetAllBlueprintsRequestHandler } from './handlers/GetAllBlueprintsRequestHandler';
import { MainHandler } from './common/MainHandler';
import { GetBlueprintInfoHandler } from './handlers/GetBlueprintInfoHandler';
import { InitialiseBlueprintPipelineHandler } from './handlers/InitialiseBlueprintPipelineHandler';
import { AttributeListHandler } from './handlers/AttributeListHandler';
import { AttributeCreateHandler } from './handlers/AttributeCreateHandler';
import { AttributeUpdateHandler } from './handlers/AttributeUpdateHandler';
import { AttributeGetDetailsHandler } from './handlers/AttributeGetDetailsHandler';
import { AttributeDeleteHandler } from './handlers/AttributeDeleteHandler';
import { SubscribeHandler } from './handlers/SubscribeHandler';
import { GetSubscriptionHandler } from './handlers/GetSubscriptionHandler';
import { UpdateBlueprintMetaInfoHandler } from './handlers/UpdateBlueprintMetaInfoHandler';

const routes = new Router()
    // Patterns routes
    .addRoute(
        (e) => e.httpMethod === 'POST' && e.resource == '/patterns',
        CreateBlueprintRequestHandler
    )
    .addRoute(
        (e) => e.httpMethod === 'GET' && e.resource == '/patterns',
        GetAllBlueprintsRequestHandler
    )
    .addRoute(
        (e) => e.httpMethod === 'GET' && e.resource == '/patterns/{id}',
        GetBlueprintInfoHandler
    )
    .addRoute(
        (e) => e.httpMethod === 'PUT' && e.resource == '/patterns/{id}',
        UpdateBlueprintMetaInfoHandler
    )
    .addRoute(
        (e) => e.httpMethod === 'PUT' && e.resource == '/patterns/pipeline/{id}',
        InitialiseBlueprintPipelineHandler
    )
    // Attributes routes
    .addRoute(
        (e) => e.httpMethod === 'POST' && e.resource == '/attributes',
        AttributeCreateHandler
    )
    .addRoute(
        (e) => e.httpMethod === 'GET' && e.resource == '/attributes',
        AttributeListHandler
    )
    .addRoute(
        (e) => e.httpMethod === 'PUT' && e.resource == '/attributes/{id}',
        AttributeUpdateHandler
    )
    .addRoute(
        (e) => e.httpMethod === 'GET' && e.resource == '/attributes/{id}',
        AttributeGetDetailsHandler
    )
    .addRoute(
        (e) => e.httpMethod === 'DELETE' && e.resource == '/attributes/{id}',
        AttributeDeleteHandler
    )
    // Pattern subscription notification routes
    .addRoute(
        (e) => e.httpMethod === 'POST' && e.resource === '/subscriptions',
        SubscribeHandler
    )
    .addRoute(
        (e) => e.httpMethod === 'DELETE' && e.resource === '/subscriptions',
        SubscribeHandler
    )
    .addRoute(
        (e) => e.httpMethod === 'GET' && e.resource === '/subscriptions',
        GetSubscriptionHandler
    );
setupContainer(routes);

export const lambdaHandler = new MainHandler(routes).lambdaHandler;
