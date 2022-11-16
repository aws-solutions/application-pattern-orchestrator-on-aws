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
import {
    makeAttributeId,
    makeAttributeName,
    syncAttribute,
    transformOutput,
} from '../../../src/common/Attribute';
import { Attribute } from '../../../src/common/common-types';
import { LoggerFactory, StaticLoggerFactory } from '../../../src/common/logging';
import {
    checkAttributeExist,
    deleteAttribute,
    updateAttribute,
} from '../../../src/service/AppRegistryIntegrationService';

jest.mock('src/service/AppRegistryIntegrationService');

const mockCheckAttributeExist = checkAttributeExist as jest.MockedFunction<
    typeof checkAttributeExist
>;
const mockDeleteAttribute = deleteAttribute as jest.MockedFunction<
    typeof deleteAttribute
>;
const mockUpdateAttribute = updateAttribute as jest.MockedFunction<
    typeof updateAttribute
>;

class BlueprintDbServiceMockWithAttribute {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async getAttributeById(id: string): Promise<Attribute> {
        return {
            id: 'TEST_ATTR_1_KEY:TEST_ATTR_1_VALUE',
            name: 'test_attr_1_key:test_attr_1_value',
            description: 'test description 1',
            key: 'test_attr_1_key',
            value: 'test_attr_1_value',
            keyIndex: 'TEST_ATTR_1_KEY',
            lastUpdateTime: '2022-05-11T23:33:09.277Z',
            createTime: '2022-05-11T23:33:09.277Z',
        };
    }
}

class BlueprintDbServiceMockWithNoAttribute {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async getAttributeById(id: string): Promise<Attribute | undefined> {
        return undefined;
    }
}

describe('attribute helper tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('test makeAttributeId', () => {
        const response = makeAttributeId('testKey', 'testValue');
        expect(response).toBe('TESTKEY:TESTVALUE');
    });

    test('test makeAttributeName', () => {
        const response = makeAttributeName('testKey', 'testValue');
        expect(response).toBe('testKey:testValue');
    });

    test('test transformOutput', () => {
        const commonProps = {
            name: 'name',
            description: 'description',
            key: 'key',
            value: 'value',
            metadata: {
                meta1: 'value1',
            },
            createTime: 'createTime',
            lastUpdateTime: 'lastUpdateTime',
        };
        const attribute: Attribute = {
            ...commonProps,
            id: 'id',
            keyIndex: 'keyIndex',
        };
        const response = transformOutput(attribute);
        expect(response).toEqual(commonProps);
    });

    test('syncAttribute: when attribute exists', async () => {
        container.register<BlueprintDbServiceMockWithAttribute>('BlueprintDBService', {
            useClass: BlueprintDbServiceMockWithAttribute,
        });
        container.register<LoggerFactory>('LoggerFactory', {
            useClass: StaticLoggerFactory,
        });
        await syncAttribute('TEST_ATTR_1_KEY:TEST_ATTR_1_VALUE');
        expect(mockCheckAttributeExist).toBeCalledTimes(0);
        expect(mockDeleteAttribute).toBeCalledTimes(0);
        expect(mockUpdateAttribute).toBeCalledTimes(1);
    });

    test('syncAttribute: when attribute does not exists', async () => {
        container.register<BlueprintDbServiceMockWithNoAttribute>('BlueprintDBService', {
            useClass: BlueprintDbServiceMockWithNoAttribute,
        });
        container.register<LoggerFactory>('LoggerFactory', {
            useClass: StaticLoggerFactory,
        });
        mockCheckAttributeExist.mockResolvedValue(true);
        await syncAttribute('TEST_ATTR_1_KEY:TEST_ATTR_1_VALUE');
        expect(mockCheckAttributeExist).toBeCalledTimes(1);
        expect(mockDeleteAttribute).toBeCalledTimes(1);
        expect(mockUpdateAttribute).toBeCalledTimes(0);
    });

    test('syncAttribute: when attribute does not exists in both dynamodb and appregistry', async () => {
        container.register<BlueprintDbServiceMockWithNoAttribute>('BlueprintDBService', {
            useClass: BlueprintDbServiceMockWithNoAttribute,
        });
        container.register<LoggerFactory>('LoggerFactory', {
            useClass: StaticLoggerFactory,
        });
        mockCheckAttributeExist.mockResolvedValue(false);

        await expect(syncAttribute('TEST_ATTR_1_KEY:TEST_ATTR_1_VALUE')).rejects.toEqual(
            new Error(
                `Specified attribute is not found. id: TEST_ATTR_1_KEY:TEST_ATTR_1_VALUE`
            )
        );
    });
});
