#!/usr/bin/env node
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
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CompliantBucket } from '../../compliant-s3-bucket/lib/compliant-s3-bucket';
import { CompliantDynamoDbTable } from '../../compliant-dynamodb-table/lib/compliant-dynamodb-table';

const app = new cdk.App();
const stack = new cdk.Stack(app);

new CompliantBucket(stack, 'DemoCompliantBucket', {
    bucketName: 'demobucket',
});

new CompliantDynamoDbTable(stack, 'DemoCompliantDynamoDbTable');
