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
import { SQSEvent, Context, SQSRecord } from 'aws-lambda';
import '../../../src/common/BaseContainer';
import { AppRegistryUpdateHandler } from '../../../src/appregistry-updater/AppRegistryUpdateHandler';
import { MainHandler } from '../../../src/appregistry-updater/MainHandler';

class TestHandler extends AppRegistryUpdateHandler {
    public handle = jest.fn();
}

describe('Main Handler test', () => {
    test('test handler invoke', async () => {
        const handler = new TestHandler();
        const lambdaHandler = new MainHandler(handler).lambdaHandler;
        handler.handle.mockResolvedValueOnce({ result: 'SUCCEED' });
        const event: SQSEvent = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Records: [{} as SQSRecord],
        };
        const result = await lambdaHandler(event, {} as Context, jest.fn());
        console.log(JSON.stringify(result, null, 4));
        expect(result).toEqual({ result: 'SUCCEED', headers: {} });
    });
});
