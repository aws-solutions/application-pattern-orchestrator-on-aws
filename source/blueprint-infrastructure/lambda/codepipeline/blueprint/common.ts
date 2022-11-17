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
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

export async function getPatternById(
    ddbDocClient: DynamoDBDocumentClient,
    patternId: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any> | undefined> {
    const params = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        TableName: process.env.RAPM_METADATA_TABLE_NAME,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Key: {
            patternId,
        },
    };
    const response = await ddbDocClient.send(new GetCommand(params));
    return response.Item;
}
