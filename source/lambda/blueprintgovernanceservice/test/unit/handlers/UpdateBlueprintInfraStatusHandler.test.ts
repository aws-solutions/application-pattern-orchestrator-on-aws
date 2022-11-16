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

import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
    CloudFormationClient,
    DescribeStacksCommand,
    Stack,
} from '@aws-sdk/client-cloudformation';
import { handler } from '../../../src/handlers/UpdateBlueprintInfraStatusHandler';
import { SNSEventRecord } from 'aws-lambda';

const ddbMock = mockClient(DynamoDBDocumentClient);
const cfMock = mockClient(CloudFormationClient);

const nonBlueprintStack: Stack = {
    StackName: 'NonBlueprintStack',
    CreationTime: new Date(),
    StackStatus: '',
    Tags: [],
};

const blueprintStack: Stack = {
    StackName: 'BlueprintStack',
    CreationTime: new Date(),
    StackStatus: '',
    Tags: [
        {
            Key: 'blueprintId',
            Value: 'blueprint',
        },
    ],
};

cfMock
    .on(DescribeStacksCommand, {
        StackName: nonBlueprintStack.StackName,
    })
    .resolves({
        Stacks: [nonBlueprintStack],
    });

cfMock
    .on(DescribeStacksCommand, {
        StackName: blueprintStack.StackName,
    })
    .resolves({
        Stacks: [blueprintStack],
    });

describe('Update blueprint infrastructure status handler tests', () => {
    test('do nothing if event is empty', async () => {
        await handler({ Records: [] }, {});
        expect(ddbMock.calls()).toHaveLength(0);
    });

    test('do nothing if event does not contain notifications', async () => {
        await handler(
            {
                Records: [],
            },
            {}
        );
        expect(ddbMock.calls()).toHaveLength(0);
    });

    test('do nothing if event does not contain cloudformation event notifications', async () => {
        await handler(
            {
                Records: [
                    {
                        Sns: {
                            Message: 'unsupported notification',
                        },
                    } as SNSEventRecord,
                ],
            },
            {}
        );
        expect(ddbMock.calls()).toHaveLength(0);
    });

    test('do nothing if event contains notification for a non blueprint stack', async () => {
        await handler(
            {
                Records: [
                    {
                        Sns: {
                            Message: `ResourceType='AWS::CloudFormation::Stack'\nStackName='${nonBlueprintStack.StackName}'`,
                        },
                    } as SNSEventRecord,
                ],
            },
            {}
        );
        expect(ddbMock.calls()).toHaveLength(0);
    });

    test('update blueprint with stack status if event contains notification for a blueprint stack', async () => {
        await handler(
            {
                Records: [
                    {
                        Sns: {
                            Message: `ResourceType='AWS::CloudFormation::Stack'\nStackName='${blueprintStack.StackName}'\nResourceStatus='CREATE_IN_PROGRESS'`,
                        },
                    } as SNSEventRecord,
                ],
            },
            {}
        );
        expect(ddbMock.calls()).toHaveLength(1);
        console.log(ddbMock.call(0).args[0].input);
        expect(ddbMock.call(0).args[0].input).toEqual({
            Key: {
                patternId: blueprintStack.Tags?.[0].Value,
            },
            TableName: undefined,
            UpdateExpression: 'SET infrastructureStackStatus = :status',
            ExpressionAttributeValues: {
                ':status': 'CREATE_IN_PROGRESS',
            },
        });
    });
});
