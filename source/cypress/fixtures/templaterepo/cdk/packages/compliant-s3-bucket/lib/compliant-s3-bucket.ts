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
import { aws_s3 as s3, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface CompliantBucketProps {
    bucketName: string;
}

export class CompliantBucket extends Construct {
    public readonly bucket: s3.Bucket;
    public constructor(scope: Construct, id: string, props: CompliantBucketProps) {
        super(scope, id);
        this.bucket = new s3.Bucket(this, 'CompliantBucket', {
            bucketName: props.bucketName,
            // Below props makes compliant s3 bucket
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true,
            removalPolicy: RemovalPolicy.RETAIN,
            serverAccessLogsPrefix: 'access-logs',
        });
    }
}
