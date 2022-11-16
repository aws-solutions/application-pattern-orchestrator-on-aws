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

import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { InputValidationResult } from '../../types/BlueprintType';
import { regKeyValue, regDescription, isInvalidArgument } from './ValidatorCommon';

/**
 * @apiDefine AttributeParams
 *
 * @apiParam {String[1..120]="[0-9a-zA-Z_-]"} key The key of the attribute
 * @apiParam {String[1..120]="[0-9a-zA-Z_-]"} value The value of the attribute
 * @apiParam {String[1..1024]} [description] The description of the attribute
 * @apiParam {Object} [metadata] The metadata of the attribute in JSON format. The maximum length is 7000.
 *
 * @apiParamExample {json} Request-Example:
 *       {
 *           "key": "hostingConstruct"
 *           "value": "Lambda"
 *           "description": "The application that is mainly based on AWS Lambda Service",
 *           "metadata": {
 *              "notes": "Only use it for serverless application"
 *           }
 *       }
 */

const maxAttributeMetaLength = 8000 - 1000; // 1000 reserved for key and value

export const payloadValidator = (
    event: APIGatewayProxyEvent,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _context: Context
): InputValidationResult => {
    const payload = JSON.parse(event.body || '{}');
    let validated = true;
    const errors: string[] = [];

    if (!payload.key || isInvalidArgument(regKeyValue, payload.key)) {
        validated &&= false;
        errors.push(`The key must be specified and match '${regKeyValue.toString()}'.`);
    }

    if (!payload.value || isInvalidArgument(regKeyValue, payload.value)) {
        validated &&= false;
        errors.push(`The value must be specified and match '${regKeyValue.toString()}'.`);
    }

    // description is optional
    if (payload.description && isInvalidArgument(regDescription, payload.description)) {
        validated &&= false;
        errors.push(
            `The description is optional but if specified it must match '${regDescription.toString()}'.`
        );
    }

    // metadata is optional
    if (payload.metadata) {
        if (JSON.stringify(payload.metadata).length > maxAttributeMetaLength) {
            validated &&= false;
            errors.push(`Metadata should not be longer than ${maxAttributeMetaLength}.`);
        }
    }

    return { validated, errors };
};
