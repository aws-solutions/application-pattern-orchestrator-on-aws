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

const mockSendMessage = jest.fn();

jest.mock('aws-sdk', () => ({
    ...jest.requireActual('aws-sdk'),
    SQS: jest.fn(() => ({
        sendMessage: mockSendMessage,
    })),
}));

const mockGetUUID = jest.fn();
jest.mock('../../../src/common/Utils', () => ({
    getUUID: mockGetUUID,
}));

import 'reflect-metadata';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as AWS from 'aws-sdk';
import { container } from 'tsyringe';
import { AppConfiguration } from '../../../src/common/configuration/AppConfiguration';
import { instance, mock, when } from 'ts-mockito';
import { addSyncRequestToQueue } from '../../../src/common/AppRegistrySyncRequestQueue';
import { LoggerFactory, StaticLoggerFactory } from '../../../src/common/logging';
import { getUUID } from '../../../src/common/Utils';

describe('test AppRegistrySyncRequestQueue', () => {
    const mockAppConfiguration: AppConfiguration = mock(AppConfiguration);

    beforeAll(() => {
        when(mockAppConfiguration.appRegistryUpdaterQueueUrl).thenReturn(
            'test-sqs-queue'
        );
        container.register<LoggerFactory>('LoggerFactory', {
            useClass: StaticLoggerFactory,
        });
        container.register<AppConfiguration>('AppConfiguration', {
            useValue: instance(mockAppConfiguration),
        });
    });

    test('should send sync request', async () => {
        mockGetUUID.mockReturnValue('abc-efg-hij');

        await addSyncRequestToQueue('TESTKEY:TESTVALUE');
        expect(mockSendMessage).toBeCalledWith({
            QueueUrl: 'test-sqs-queue',
            MessageBody: JSON.stringify({
                id: 'TESTKEY:TESTVALUE',
                requestId: getUUID(),
            }),
            MessageGroupId: 'appregistry-sync',
        });
    });

    test('should return null', async () => {
        mockGetUUID.mockReturnValue('abc-efg-hij');
        mockSendMessage.mockImplementationOnce(() => ({
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            promise: () => Promise.reject('test error'),
        }));

        expect(await addSyncRequestToQueue('TESTKEY:TESTVALUE')).toBeUndefined();
    });
});
