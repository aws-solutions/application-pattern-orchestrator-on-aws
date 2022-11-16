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

import { BasicHttpError, BasicHttpResponse } from '../../../src/common/common-types';

/* eslint-disable */
describe.only('Basic http error tests', () => {
  test('test basic http error with parameters', () => {
    expect(new BasicHttpError(200, 'test message', true)).toEqual({
      message: 'test message',
      name: 'BasicHttpError',
      retryable: true,
      statusCode: 200
    });
  });

  test('test basic http error without parameters', () => {
    expect(new BasicHttpError(400)).toEqual({
      message: '',
      name: 'BasicHttpError',
      retryable: false,
      statusCode: 400
    });
  });

  test('test basic http error with internal server error', () => {
    expect(BasicHttpError.internalServerError('error occurs')).toEqual({
      message: 'error occurs',
      name: 'BasicHttpError',
      retryable: false,
      statusCode: 500
    });
  });
});

describe.only('Basic http response tests', () => {
  test('test basic http response with constructor', () => {
    expect(
      new BasicHttpResponse(200, 'test message', { header1: 'value1' })
    ).toEqual({
      body: 'test message',
      headers: {
        header1: 'value1'
      },
      statusCode: 200
    });
  });

  test('test basic http response with constructor no body', () => {
    expect(new BasicHttpResponse(200)).toEqual({
      body: '',
      statusCode: 200
    });
  });

  test('test basic http response with error object', () => {
    expect(
      BasicHttpResponse.ofError(new BasicHttpError(401, 'error occurs', true))
    ).toEqual({
      body: JSON.stringify({ error: 'error occurs', retryable: true }),
      headers: {
        'Content-Type': 'application/json'
      },
      statusCode: 401
    });
  });

  test('test basic http response with record object', () => {
    expect(BasicHttpResponse.ofRecord(201, { testKey: 'testValue' })).toEqual({
      body: JSON.stringify({ testKey: 'testValue' }),
      headers: {
        'Content-Type': 'application/json'
      },
      statusCode: 201
    });
  });

  test('test basic http response with string', () => {
    expect(BasicHttpResponse.ofString(202, 'Test string here')).toEqual({
      body: 'Test string here',
      headers: {
        'Content-Type': 'text/plain'
      },
      statusCode: 202
    });
  });

  test('test basic http response with object', () => {
    const testObj = {
      testKey: 'testValue',
      testArray: ['abc', 'def'],
      testSubObj: {
        testKey2: 'testvalue2'
      }
    };
    expect(BasicHttpResponse.ofObject(204, testObj)).toEqual({
      body: JSON.stringify(testObj),
      headers: {
        'Content-Type': 'application/json'
      },
      statusCode: 204
    });
  });

  test('test basic http response with extra header', () => {
    const response = new BasicHttpResponse(202, 'Test string here')
      .addHeaders({
        'extra-header': 'header value'
      })
      .addHeaders({ 'extra-header-1': 'header value 1' });
    expect(response).toEqual({
      body: 'Test string here',
      statusCode: 202,
      headers: {
        'extra-header': 'header value',
        'extra-header-1': 'header value 1'
      }
    });
  });
});
