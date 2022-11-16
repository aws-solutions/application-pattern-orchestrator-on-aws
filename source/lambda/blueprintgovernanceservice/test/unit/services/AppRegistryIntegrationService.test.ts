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
/* eslint-disable @typescript-eslint/explicit-function-return-type */

const mockGetAttributeGroup = jest.fn();
const mockCreateAttributeGroup = jest.fn();
const mockDeleteAttributeGroup = jest.fn();
const mockTagResource = jest.fn();
const mockUpdateAttributeGroup = jest.fn();

jest.mock('aws-sdk', () => ({
    ...jest.requireActual('aws-sdk'),
    ServiceCatalogAppRegistry: jest.fn(() => ({
        getAttributeGroup: mockGetAttributeGroup,
        createAttributeGroup: mockCreateAttributeGroup,
        deleteAttributeGroup: mockDeleteAttributeGroup,
        updateAttributeGroup: mockUpdateAttributeGroup,
        tagResource: mockTagResource,
    })),
}));

import 'reflect-metadata';
import { container } from 'tsyringe';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as AWS from 'aws-sdk';
import { instance, mock } from 'ts-mockito';
import { Attribute } from '../../../src/common/common-types';
import {
    checkAttributeExist,
    updateAttribute,
    deleteAttribute,
} from '../../../src/service/AppRegistryIntegrationService';
import { LoggerFactory, StaticLoggerFactory } from '../../../src/common/logging';
import { AppConfiguration } from '../../../src/common/configuration/AppConfiguration';

const attribute: Attribute = {
    id: 'test-attribute-1',
    keyIndex: 'test-key-index',
    name: 'securityLevel:high',
    description: 'securityLevel description',
    key: 'securityLevel',
    value: 'high',
    metadata: {
        key1: 'value1',
    },
    createTime: '2021-11-17T06:02:15.035Z',
    lastUpdateTime: '2021-11-17T06:02:15.035Z',
};

const attributeGroup = {
    id: '00mjrsor86r5qfsaije8ti4eut',
    arn: 'arn:aws:servicecatalog:ap-southeast-2:123456789:/attribute-groups/00mjrsor86r5qfsaije8ti4eut',
    name: 'APO.SECURITYLEVEL.HIGH',
    description: '',
    attributes:
        '{"attributeName":"SecurityLevel:High","attributeKey":"SecurityLevel","attributeValue":"High","attributeCreateTime":"2022-07-17T12:03:43.659Z","attributeLastUpdateTime":"2022-07-17T12:03:43.659Z"}',
    creationTime: '2022-07-17T12:03:44.078000+00:00',
    lastUpdateTime: '2022-07-17T12:03:44.078000+00:00',
    tags: {
        managedBy: 'BlueprintService',
    },
};

describe('test AppRegistryIntegrationService', () => {
    const mockAppConfiguration: AppConfiguration = mock(AppConfiguration);

    beforeAll(() => {
        container.register<LoggerFactory>('LoggerFactory', {
            useClass: StaticLoggerFactory,
        });
        container.register<AppConfiguration>('AppConfiguration', {
            useValue: instance(mockAppConfiguration),
        });
    });

    beforeEach(() => {
        mockGetAttributeGroup.mockClear();
        mockCreateAttributeGroup.mockClear();
        mockDeleteAttributeGroup.mockClear();
        mockTagResource.mockClear();
    });

    test('checkAttributeExist returns true', async () => {
        mockGetAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(),
        }));
        expect(await checkAttributeExist(attribute.name)).toBe(true);
        expect(mockGetAttributeGroup).toBeCalledTimes(1);
        expect(mockGetAttributeGroup).toBeCalledWith({
            attributeGroup: `APO.${attribute.key.toUpperCase()}.${attribute.value.toUpperCase()}`,
        });
    });

    test('checkAttributeExist returns false when not found', async () => {
        mockGetAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.reject({ code: 'ResourceNotFoundException' }),
        }));
        expect(await checkAttributeExist(attribute.name)).toBe(false);
        expect(mockGetAttributeGroup).toBeCalledTimes(1);
        expect(mockGetAttributeGroup).toBeCalledWith({
            attributeGroup: `APO.${attribute.key.toUpperCase()}.${attribute.value.toUpperCase()}`,
        });
    });

    test('checkAttributeExist throws exception', async () => {
        // mockGetAttributeGroup.mockRejectedValueOnce(new Error('test error'));
        mockGetAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.reject('test'),
        }));

        let errorMsg = undefined;
        try {
            await checkAttributeExist(attribute.name);
        } catch (error) {
            errorMsg = error as string;
        }
        expect(errorMsg).toBe('test');
    });

    test('updateAttribute to create a new attribute', async () => {
        mockGetAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.reject({ code: 'ResourceNotFoundException' }),
        }));
        mockCreateAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(),
        }));

        await updateAttribute(attribute);

        expect(mockCreateAttributeGroup).toBeCalledWith({
            name: attributeGroup.name,
            description: attribute.description,
            attributes: JSON.stringify({
                ...attribute.metadata,
                attributeName: attribute.name,
                attributeKey: attribute.key,
                attributeValue: attribute.value,
                attributeCreateTime: attribute.createTime,
                attributeLastUpdateTime: attribute.lastUpdateTime,
            }),
            clientToken: '',
            tags: {
                managedBy: 'Rapm',
            },
        });
    });

    test('updateAttribute to update existing attribute', async () => {
        mockGetAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(attributeGroup),
        }));
        mockUpdateAttributeGroup.mockImplementationOnce(() => ({
            promise: () =>
                Promise.resolve({
                    attributeGroup,
                }),
        }));
        mockTagResource.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(),
        }));
        await updateAttribute(attribute);

        expect(mockUpdateAttributeGroup).toBeCalledWith({
            attributeGroup: attributeGroup.name,
            name: attributeGroup.name,
            description: attribute.description,
            attributes: JSON.stringify({
                ...attribute.metadata,
                attributeName: attribute.name,
                attributeKey: attribute.key,
                attributeValue: attribute.value,
                attributeCreateTime: attribute.createTime,
                attributeLastUpdateTime: attribute.lastUpdateTime,
            }),
        });

        expect(mockTagResource).toBeCalledWith({
            resourceArn: attributeGroup.arn,
            tags: {
                managedBy: 'Rapm',
            },
        });
    });

    test('updateAttribute - negative case 1', async () => {
        mockGetAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.reject('test error'),
        }));

        let errMsg = '';
        try {
            await updateAttribute(attribute);
        } catch (error) {
            errMsg = error as string;
        }
        expect(errMsg).toBe('test error');
    });

    test('updateAttribute - negative case 2', async () => {
        mockGetAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(attributeGroup),
        }));
        mockUpdateAttributeGroup.mockImplementationOnce(() => ({
            promise: () =>
                Promise.resolve({
                    attributeGroup: {},
                }),
        }));
        mockTagResource.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(),
        }));

        let errCode = undefined;
        try {
            await updateAttribute(attribute);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            errCode = error.statusCode;
        }
        expect(errCode).toBe(500);
    });

    test('deleteAttribute succeed', async () => {
        mockGetAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(attributeGroup),
        }));
        mockDeleteAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(),
        }));

        await deleteAttribute(attribute.name);

        expect(mockDeleteAttributeGroup).toBeCalledWith({
            attributeGroup: attributeGroup.name,
        });
    });

    test('deleteAttribute - negative case', async () => {
        mockGetAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.reject({ code: 'ResourceNotFoundException' }),
        }));
        mockDeleteAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(),
        }));

        await deleteAttribute(attribute.name);

        expect(mockDeleteAttributeGroup).not.toBeCalled();
    });

    test('deleteAttribute - negative case 2', async () => {
        mockGetAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.reject('test error'),
        }));
        mockDeleteAttributeGroup.mockImplementationOnce(() => ({
            promise: () => Promise.resolve(),
        }));

        let errorMsg = undefined;
        try {
            await deleteAttribute(attribute.name);
        } catch (error) {
            errorMsg = error as string;
        }
        expect(errorMsg).toBe('test error');

        expect(mockDeleteAttributeGroup).not.toBeCalled();
    });
});
