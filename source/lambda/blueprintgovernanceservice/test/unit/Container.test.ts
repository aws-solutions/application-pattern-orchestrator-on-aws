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
import { Router } from '../../src/common/router/Router';
import { container } from 'tsyringe';
import '../../src/common/BaseContainer';
import { setupContainer } from '../../src/Container';
import { CreateBlueprintRequestHandler } from '../../src/handlers/CreateBlueprintRequestHandler';

const router = new Router().addRoute(
    (e) => e.httpMethod === 'POST' && e.resource == '/blueprints',
    CreateBlueprintRequestHandler
);

describe('test request handler registration', () => {
    beforeAll(() => {
        setupContainer(router);
    });

    test('resolve CreateBlueprintRequestHandler', () => {
        expect(container.resolve('CreateBlueprintRequestHandler')).toBeDefined();
    });

    test('resolve APIGateway', () => {
        expect(container.resolve('APIGateway')).toBeDefined();
    });

    test('resolve SecretsManager', () => {
        expect(container.resolve('SecretsManager')).toBeDefined();
    });

    test('resolve CodeBuildClient', () => {
        expect(container.resolve('CodeBuildClient')).toBeDefined();
    });

    test('resolve APIGateway', () => {
        process.env.PROXY_URI = 'http://Proxy';
        expect(container.resolve('APIGateway')).toBeDefined();
    });
});
