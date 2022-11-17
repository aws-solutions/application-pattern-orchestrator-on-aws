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

import { Stack } from 'aws-cdk-lib';
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { PatternType } from './blueprint-types';

export interface BlueprintFrontendConfigProps {
    readonly vpc: IVpc;
    readonly frontendBucket: IBucket;
    readonly distribution: IDistribution;
    readonly backendApiUrl: string;
    readonly appClientId: string;
    readonly identityPoolId: string;
    readonly userPoolId: string;
    readonly patternType: PatternType;
    readonly cognitoDomain: string;
}

export class BlueprintFrontendConfig extends Construct {
    public constructor(
        scope: Construct,
        id: string,
        props: BlueprintFrontendConfigProps
    ) {
        super(scope, id);

        // customDomain is not currently supported. It is added here for future extension.
        const customDomain = this.node.tryGetContext('customDomain');
        const redirectUri = customDomain
            ? `https://${customDomain}`
            : `https://${props.distribution.distributionDomainName}`;

        const config = {
            region: Stack.of(this).region,
            userPoolId: props.userPoolId,
            appClientId: props.appClientId,
            identityPoolId: props.identityPoolId,
            redirectUri,
            cognitoDomain: props.cognitoDomain,
            backendApi: props.backendApiUrl,
            patternType: props.patternType,
        };

        const envjsContent = `
        const env = ${JSON.stringify(config)}
        window.EnvironmentConfig = env;`;

        /**
         * S3 Deploy
         * Uploads react built code and env.js to the S3 bucket and invalidates CloudFront
         */
        new BucketDeployment(this, 'Deploy-Frontend', {
            sources: [
                Source.asset('./blueprint-ui/build'),
                Source.data('env.js', envjsContent),
            ],
            destinationBucket: props.frontendBucket,
            memoryLimit: 3008,
            prune: false,
            distribution: props.distribution,
        });
    }
}
