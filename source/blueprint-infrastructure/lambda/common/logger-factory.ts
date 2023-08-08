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
import * as winston from 'winston';
import { Logger, LogLevelType } from './logger-type';

// eslint-disable-next-line @typescript-eslint/naming-convention
const DEFAULT_LOG_LEVEL = 'debug';

export interface LoggerFactory {
    getLogger(name: string, logLevel?: LogLevelType): Logger;
}

export class StaticLoggerFactory implements LoggerFactory {
    public getLogger(name: string, logLevel?: LogLevelType): Logger {
        return winston.createLogger({
            transports: [new winston.transports.Console()],
            format: winston.format.combine(
                winston.format.label({ label: name }),
                winston.format.timestamp(),
                winston.format.splat(),
                winston.format.json(),
            ),
            level: logLevel ?? DEFAULT_LOG_LEVEL,
        });
    }
}
