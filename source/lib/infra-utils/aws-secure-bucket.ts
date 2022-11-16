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
import { Construct } from 'constructs';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { PolicyStatement, Effect, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';

export type AWSSecureBucketProps = Omit<
    s3.BucketProps,
    | 'encryptionKey'
    | 'encryption'
    | 'blockPublicAccess'
    | 'accessControl'
    | 'versioned'
    | 'serverAccessLogsPrefix'
> & { encryptionKeyArn?: string };

export class AWSSecureBucket extends Construct {
    public readonly bucket: s3.Bucket;
    public readonly encryptionKey: IKey;

    public constructor(scope: Construct, id: string, props: AWSSecureBucketProps) {
        super(scope, id);

        this.encryptionKey = props.encryptionKeyArn
            ? Key.fromKeyArn(this, `encryption-key-${id}`, props.encryptionKeyArn)
            : new Key(this, `encryption-key-${id}`, {
                  removalPolicy: props.removalPolicy,
                  enableKeyRotation: true,
              });

        this.bucket = new s3.Bucket(this, `ags-${id}`, {
            ...props,
            encryptionKey: this.encryptionKey,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
            serverAccessLogsPrefix: 'access-log',
            versioned: true,
        });

        this.bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'HttpsOnly',
                resources: [`${this.bucket.bucketArn}/*`],
                actions: ['*'],
                principals: [new AnyPrincipal()],
                effect: Effect.DENY,
                conditions: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    Bool: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        'aws:SecureTransport': 'false',
                    },
                },
            })
        );
        NagSuppressions.addResourceSuppressions(
            this.bucket,
            [
                {
                    id: 'AwsSolutions-S10',
                    reason: 'This is false positive. Bucket policy has condition to block Non Https traffic',
                },
            ],
            true
        );
    }
}
