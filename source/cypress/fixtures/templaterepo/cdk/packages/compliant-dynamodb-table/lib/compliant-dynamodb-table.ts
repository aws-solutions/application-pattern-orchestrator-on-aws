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
import { aws_dynamodb as ddb } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface CompliantDynamoDbTableProps {
    tableName: string;
}

export class CompliantDynamoDbTable extends Construct {
    public readonly table: ddb.Table;
    public constructor(
        scope: Construct,
        id: string,
        props?: CompliantDynamoDbTableProps,
    ) {
        super(scope, id);
        this.table = new ddb.Table(this, 'CompliantDdbTable', {
            tableName: props?.tableName,
            partitionKey: { name: 'id', type: ddb.AttributeType.STRING },
            // Compliant dynamodb table props
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            encryption: ddb.TableEncryption.AWS_MANAGED,
        });
    }
}
