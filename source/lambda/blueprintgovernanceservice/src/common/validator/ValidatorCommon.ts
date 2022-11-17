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
import isString from 'lodash.isstring';

export const regKeyValueAllowEmptyString = /^[-\w]{0,120}$/;

export const regKeyValue = /^[-\w]{1,120}$/;

export const regDescription = /^.{1,1024}$/;

export const regTagKey = /^(?!aws:)[a-zA-Z+\-=._:/]{1,128}$/;

export const regTagValue = /^[\w.:/=+\-@]{1,256}$/;

export const regTagValueAllowEmptyString = /^[\w.:/=+\-@]{0,256}$/;

export function isInvalidArgument(reg: RegExp, value: string): boolean {
    return !isString(value) || value.trim().length === 0 || !reg.test(value);
}
