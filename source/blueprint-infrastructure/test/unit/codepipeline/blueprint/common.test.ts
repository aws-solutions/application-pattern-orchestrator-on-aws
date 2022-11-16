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
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { getPatternById } from '../../../../lambda/codepipeline/blueprint/common';

const ddbMock = mockClient(DynamoDBDocumentClient);

const fixturePatternMetaData = {
    updatedTimestamp: '2022-07-08T02:33:47.623Z',
    blueprintType: 'CFN',
    blueprintId: 'test-blueprint',
    lastCommitId: 'ef727e767659e288c070230965bce001982bdaa4',
    description: 'Test CFN based pattern',
    blueprintRepoURL: 'git://test/test-blueprint.git',
    createdTimestamp: '2022-07-04T08:51:49.816Z',
    name: 'test-blueprint',
    infrastructureStackStatus: 'UPDATE_COMPLETE',
    attributes: {
        DataClassification: 'Low',
        RiskLevel: 'High',
    },
};

describe('common functions test', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        ddbMock.reset();
    });

    it('should return pattern details', async () => {
        process.env.RAPM_METADATA_TABLE_NAME = 'test-table';
        ddbMock
            .on(GetCommand, {
                TableName: 'test-table',
                Key: { patternId: 'test-blueprint' },
            })
            .resolves({
                Item: fixturePatternMetaData,
            });
        const dynamodb = new DynamoDBClient({});
        const ddbDocClient = DynamoDBDocumentClient.from(dynamodb);
        const patternDetails = await getPatternById(ddbDocClient, 'test-blueprint');
        expect(patternDetails).toEqual(fixturePatternMetaData);
    });
});
