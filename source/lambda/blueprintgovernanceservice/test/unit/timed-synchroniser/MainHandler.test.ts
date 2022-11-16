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
import { EventBridgeEvent, Context } from 'aws-lambda';
import '../../../src/common/BaseContainer';
import { MainHandler } from '../../../src/timed-synchroniser/MainHandler';
import { SyncEventHandler } from '../../../src/timed-synchroniser/SyncEventHandler';

class TestHandler extends SyncEventHandler {
    public handle = jest.fn();
}

describe('Main Handler test', () => {
    test('test handler invoke', async () => {
        const handler = new TestHandler();
        const lambdaHandler = new MainHandler(handler).lambdaHandler;
        handler.handle.mockResolvedValueOnce({ result: 'SUCCEED' });
        const event = {} as EventBridgeEvent<string, unknown>;
        const result = await lambdaHandler(event, {} as Context, jest.fn());
        expect(result).toEqual({ result: 'SUCCEED', headers: {} });
    });
});
