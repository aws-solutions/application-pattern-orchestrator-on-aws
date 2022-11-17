/* eslint-disable */
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
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Context, SNSEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, splitIntoBatches } from '../../../src/email-sender';
import { mockSendFn as mockSes } from '../../../__mocks__/@aws-sdk/client-ses';

const mockDdb = mockClient(DynamoDBClient);

describe('email sender tests', () => {
    const context: Context = {} as Context;
    const event: SNSEvent = {
        Records: [
            {
                EventSource: 'aws:sns',
                EventVersion: '1.0',
                EventSubscriptionArn: 'sns:arn',
                Sns: {
                    Subject: '',
                    UnsubscribeUrl: '',
                    Timestamp: new Date().toISOString(),
                    Signature: 'sig',
                    SignatureVersion: '1',
                    MessageAttributes: {},
                    SigningCertUrl: '1234',
                    Type: 'Notification',
                    MessageId: '1234',
                    TopicArn: 'topicarn',
                    Message: JSON.stringify({
                        patternId: '1234567890',
                        patternName: 'my test pattern',
                        patternAttributes: {
                            data_classification: 'High',
                        },
                        patternUri: 'https://pattern.com',
                        commitMessage: 'feat: initial commit',
                        commitId: 'my_uber_commit_id',
                        sourceRepo: 'https://github.com/testing123',
                        modifiedPackages: [
                            {
                                name: 'web',
                                version: '1.0.0',
                            },
                            {
                                name: 'db',
                                version: '2.0.0',
                            },
                        ],
                        codeArtifact: {
                            account: '12345678',
                            region: 'ap-southeast-2',
                            domain: 'awspatterns',
                            repository: 'awspatterns',
                        },
                    }),
                },
            },
        ],
    };

    beforeEach(() => {
        mockDdb.reset();
        mockSes.mockReset();
    });

    test('do nothing if event contains no messages', async () => {
        // act
        await handler({ Records: [] } as unknown as SNSEvent, context);

        // assert
        expect(mockDdb.calls).toHaveLength(0);
        expect(mockSes).not.toHaveBeenCalled();
    });

    test('blow up if no verified email found in SES', async () => {
        // arrange
        mockSes.mockResolvedValueOnce({});

        // act
        const task = () => handler(event, context);

        // assert
        await expect(() => task()).rejects.toThrow();
        expect(mockDdb.calls).toHaveLength(0);
    });

    test('do nothing if there are no recipients', async () => {
        // arrange
        mockSes.mockResolvedValueOnce({ VerifiedEmailAddresses: ['test@amazon.com'] });
        mockDdb.resolvesOnce({});

        // act
        await handler(event, context);

        // assert
        expect(mockSes).toHaveBeenCalledTimes(1);
    });

    test('can send notification emails', async () => {
        // arrange
        mockSes.mockResolvedValueOnce({ VerifiedEmailAddresses: ['test@amazon.com'] });
        mockDdb.resolvesOnce({
            Items: [{ email: { S: 'destination@amazon.com' } }],
        });

        // act
        await handler(event, context);

        // assert
        expect(mockSes).toHaveBeenCalledTimes(2);
    });

    test('can batch send email requests for very long recipient lists', async () => {
        // arrange
        const emailLists = [];
        while (emailLists.length <= 50) {
            emailLists.push({ email: { S: 'destination@amazon.com' } });
        }
        mockSes.mockResolvedValueOnce({ VerifiedEmailAddresses: ['test@amazon.com'] });
        mockDdb.resolvesOnce({
            Items: emailLists,
        });

        // act
        await handler(event, context);

        // assert
        expect(mockSes).toHaveBeenCalledTimes(3);
    });

    test('can split long array into smaller batches', () => {
        // act
        const results = splitIntoBatches([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);

        // assert
        expect(results).toHaveLength(4);
        expect(new Set(results[0])).toEqual(new Set([1, 2, 3]));
        expect(new Set(results[1])).toEqual(new Set([4, 5, 6]));
        expect(new Set(results[2])).toEqual(new Set([7, 8, 9]));
        expect(new Set(results[3])).toEqual(new Set([10]));
    });

    test('should not split small array', () => {
        // act
        const results = splitIntoBatches([1, 2, 3, 4, 5], 10);

        // assert
        expect(results).toHaveLength(1);
        expect(new Set(results[0])).toEqual(new Set([1, 2, 3, 4, 5]));
    });
});
