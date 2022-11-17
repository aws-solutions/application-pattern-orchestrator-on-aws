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

import { Construct } from 'constructs';

import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
    Bucket,
    IBucket,
    BucketEncryption,
    BucketAccessControl,
    BlockPublicAccess,
} from 'aws-cdk-lib/aws-s3';

import {
    OriginAccessIdentity,
    SourceConfiguration,
    CloudFrontAllowedCachedMethods,
    CloudFrontAllowedMethods,
    CloudFrontWebDistribution,
    CfnDistribution,
} from 'aws-cdk-lib/aws-cloudfront';
import { addCfnNagSuppression } from './cfn-nag-suppression';
import { NagSuppressions } from 'cdk-nag';
import { AnyPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export interface BlueprintFrontendProps {
    webAclArn?: string;
    removalPolicy: RemovalPolicy;
}

export class BlueprintFrontend extends Construct {
    public readonly frontendBucket: IBucket;
    public readonly distribution: CloudFrontWebDistribution;

    public constructor(scope: Construct, id: string, props: BlueprintFrontendProps) {
        super(scope, id);

        /**
         * S3 Bucket
         * Hosts the React application code.
         */
        this.frontendBucket = new Bucket(this, 'ReactApp', {
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'index.html',
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: new BlockPublicAccess(BlockPublicAccess.BLOCK_ALL),
            serverAccessLogsPrefix: 'access_logs/',
            accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
            versioned: true,
            removalPolicy: props.removalPolicy,
            autoDeleteObjects: props.removalPolicy === RemovalPolicy.DESTROY,
        });
        this.addHttpsOnlyPolicyCondition(this.frontendBucket);

        NagSuppressions.addResourceSuppressions(
            this.frontendBucket,
            [
                {
                    id: 'AwsSolutions-S5',
                    reason: 'CloudFront Origin Access Identity (OAI) will be configured by customer',
                },
                {
                    id: 'AwsSolutions-S1',
                    reason: 'This is false positive. Bucket does have access logging enabled',
                },
                {
                    id: 'AwsSolutions-S10',
                    reason: 'This is false positive. Bucket policy has condition to block Non Https traffic',
                },
            ],
            true
        );

        /**
         * CloudFront Distribution
         * Fronts the S3 bucket as CDN to provide caching and HTTPS.
         */
        const originAccess = new OriginAccessIdentity(this, 'CloudFrontOriginAccess');
        this.frontendBucket.grantRead(originAccess);

        const originConfigs: SourceConfiguration[] = [
            {
                behaviors: [
                    {
                        isDefaultBehavior: true,
                        cachedMethods: CloudFrontAllowedCachedMethods.GET_HEAD,
                        compress: false,
                        defaultTtl: Duration.minutes(30),
                        allowedMethods: CloudFrontAllowedMethods.ALL,
                        forwardedValues: {
                            queryString: true,
                            cookies: {
                                forward: 'all',
                            },
                            headers: ['headers'],
                        },
                    },
                ],
                s3OriginSource: {
                    s3BucketSource: this.frontendBucket,
                    originAccessIdentity: originAccess,
                },
            },
        ];

        // logging bucket for CloudFront
        const loggingBucket = new Bucket(this, 'LoggingBucket', {
            autoDeleteObjects: props.removalPolicy === RemovalPolicy.DESTROY,
            removalPolicy: props.removalPolicy,
            versioned: true,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            encryption: BucketEncryption.S3_MANAGED,
        });
        this.addHttpsOnlyPolicyCondition(loggingBucket);

        NagSuppressions.addResourceSuppressions(
            loggingBucket,
            [
                {
                    id: 'AwsSolutions-S1',
                    reason: 'The bucket itself is a logging bucket for CloudFrontDistribution',
                },
                {
                    id: 'AwsSolutions-S10',
                    reason: 'This is false positive. Bucket policy has condition to block Non Https traffic',
                },
            ],
            true
        );
        addCfnNagSuppression(loggingBucket as Construct, [
            {
                id: 'W35',
                reason: 'Logging bucket for CloudFront logs',
            },
        ]);

        this.distribution = new CloudFrontWebDistribution(
            this,
            'CloudFrontDistribution',
            {
                errorConfigurations: [
                    {
                        errorCode: 404,
                        responseCode: 200,
                        responsePagePath: '/index.html',
                    },
                ],
                originConfigs: originConfigs,
                loggingConfig: {
                    bucket: loggingBucket,
                    includeCookies: true,
                    prefix: '',
                },
                webACLId: props.webAclArn,
            }
        );

        const cfnDist: CfnDistribution = this.distribution.node
            .defaultChild as CfnDistribution;
        cfnDist.cfnOptions.metadata = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            cfn_nag: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                rules_to_suppress: [
                    {
                        id: 'W10',
                        reason: 'CloudFront Distribution is disabled as there are no user requirements, plus to keep the cost low',
                    },
                    {
                        id: 'W70',
                        reason: 'If the distribution uses the CloudFront domain name such as d111111abcdef8.cloudfront.net (you set CloudFrontDefaultCertificate to true), CloudFront automatically sets the security policy to TLSv1 regardless of the value that you set here.',
                    },
                ],
            },
        };

        /**
         * Stack Outputs
         */
        new CfnOutput(this, 'CloudFrontURL', {
            value: this.distribution.distributionDomainName,
            exportName: 'rapmExportedPortalUrl',
        });
        new CfnOutput(this, 'ReactAppBucketName', {
            value: this.frontendBucket.bucketName,
        });
    }

    private addHttpsOnlyPolicyCondition(bucket: IBucket): void {
        bucket.addToResourcePolicy(
            new PolicyStatement({
                sid: 'HttpsOnly',
                resources: [`${bucket.bucketArn}/*`],
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
    }
}
