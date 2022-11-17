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
import '../../../src/common/BaseContainer';
import { SQSEvent, Context } from 'aws-lambda';
import { AppRegistryUpdateHandler } from '../../../src/appregistry-updater/AppRegistryUpdateHandler';
import { syncAttribute } from '../../../src/common/Attribute';

jest.mock('src/common/Attribute');
jest.mock('src/service/AppRegistryIntegrationService');

const mockedSyncAttribute = syncAttribute as jest.MockedFunction<typeof syncAttribute>;

const event = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Records: [
        {
            body: JSON.stringify({ id: 'TEST-ATTRIBUTE-1' }),
        },
        {
            body: JSON.stringify({ id: 'TEST-ATTRIBUTE-2' }),
        },
    ],
};

describe('AppRegistryUpdateHandler test', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedSyncAttribute.mockClear();
        mockedSyncAttribute.mockReset();
    });

    test('test success event', async () => {
        const handler = new AppRegistryUpdateHandler();

        mockedSyncAttribute.mockResolvedValueOnce().mockResolvedValueOnce();

        const result = await handler.handle(event as SQSEvent, {} as Context);

        expect(result).toEqual({
            body: 'SUCCEED',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'text/plain',
            },
            statusCode: 200,
        });

        expect(mockedSyncAttribute).toBeCalledTimes(2);
        expect(mockedSyncAttribute.mock.calls[0]).toEqual(['TEST-ATTRIBUTE-1']);
        expect(mockedSyncAttribute.mock.calls[1]).toEqual(['TEST-ATTRIBUTE-2']);
    });
});
