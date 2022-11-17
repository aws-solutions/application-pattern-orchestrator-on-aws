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
import * as Winston from 'winston';
import { Console } from 'winston/lib/winston/transports/index';
import { LambdaLoggerFactory, StaticLoggerFactory } from '../../../src/common/logging';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

jest.unmock('winston');

const loggerFactory = new LambdaLoggerFactory({} as APIGatewayProxyEvent, {} as Context);
describe('LoggerFactory', () => {
    test('it creates logger', () => {
        const log = loggerFactory.getLogger('bla');
        expect(log).toBeDefined();
    });

    test('it logs in correct format', () => {
        const log = loggerFactory.getLogger('foo', 'info');
        expect((<Winston.Logger>log).level).toBe('info');

        const logConsole = (Console.prototype.log = jest.fn());
        log.error('test message');

        expect(logConsole).toHaveBeenCalledTimes(1);
        expect(logConsole).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringMatching('test message'),
                // Unfortunately bug in Jest prevents from matching Symbol fields
                // So we test it again below
                // https://github.com/facebook/jest/issues/6466
            }),
            expect.anything()
        );

        // can't match the entire string due to timestamp being random
        expect(
            logConsole.mock.calls[0][0][Symbol.for('message')]
                .toString()
                .startsWith(
                    '{"message":"test message","level":"error","label":"foo","timestamp":"'
                )
        ).toBe(false);
    });

    test('should populate additional metadata', () => {
        const loggerFactory = new LambdaLoggerFactory(
            { path: '/test' } as APIGatewayProxyEvent,
            {} as Context,
            undefined,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            { path: (e, _): string => e.path }
        );
        const log = loggerFactory.getLogger('foo', 'info');
        expect((<Winston.Logger>log).level).toBe('info');

        const logConsole = (Console.prototype.log = jest.fn());
        log.error('test message');

        expect(logConsole).toHaveBeenCalledTimes(1);
        expect(logConsole).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringMatching('test message'),
                // Unfortunately bug in Jest prevents from matching Symbol fields
                // So we test it again below
                // https://github.com/facebook/jest/issues/6466
            }),
            expect.anything()
        );

        // can't match the entire string due to timestamp being random
        expect(
            logConsole.mock.calls[0][0][Symbol.for('message')]
                .toString()
                .startsWith(
                    '{"message":"test message","level":"error","path":"/test","label":"foo","timestamp":"'
                )
        ).toBe(false);
    });

    test('can create logger from static logger factory', () => {
        const factory = new StaticLoggerFactory();

        const logger = factory.getLogger('test');

        expect(logger).toBeDefined();
    });
});
