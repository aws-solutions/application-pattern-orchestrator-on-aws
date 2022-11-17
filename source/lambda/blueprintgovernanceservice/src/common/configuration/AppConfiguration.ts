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

import { LogLevelType } from '../logging';

export type DependencyServiceName = 'BLUEPRINTGOVERNANCE';

export interface Dependency {
    name: DependencyServiceName;
    githubTokenSecretId?: string;
}

export class AppConfiguration {
    public readonly applicationName: string;
    public readonly runningLocally: boolean;
    public readonly logLevel: LogLevelType;
    public readonly region: string;
    public readonly dependencies: Dependency[];
    public readonly appRegistryUpdaterQueueUrl: string;

    public constructor(applicationName: string) {
        this.applicationName = applicationName;
        this.runningLocally = process.env.AWS_SAM_LOCAL ? true : false;
        this.region = process.env.AWS_REGION ?? 'ap-southeast-2';
        this.logLevel = (process.env.LOG_LEVEL ?? 'info') as LogLevelType;
        this.appRegistryUpdaterQueueUrl = process.env.APPREGISTRY_UPDATER_QUEUE_URL ?? '';
        this.dependencies = [
            {
                name: 'BLUEPRINTGOVERNANCE',
                githubTokenSecretId:
                    process.env[environmentVariables.githubTokenSecretId],
            },
        ];
    }
    public readonly proxyUri: string | undefined =
        process.env[environmentVariables.proxyUri];

    public getDepdencyFor(name: DependencyServiceName): Dependency | undefined {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return this.dependencies.find((d) => d.name === name);
    }
}

export const environmentVariables = {
    proxyUri: 'PROXY_URI',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    RAPM_METADATA_TABLE_NAME: 'RAPM_METADATA_TABLE_NAME',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    RAPM_PUBLISH_DATA_TABLE_NAME: 'RAPM_PUBLISH_DATA_TABLE_NAME',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    RAPM_ATTRIBUTES_TABLE_NAME: 'RAPM_ATTRIBUTES_TABLE_NAME',
    snsBlueprintTopic: 'SNS_BLUEPRINT_TOPIC',
    githubTokenSecretId: 'githubTokenSecretId',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    BLUEPRINT_CODE_BUILD_JOB_PROJECT_NAME: 'BLUEPRINT_CODE_BUILD_JOB_PROJECT_NAME',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    S3_BUCKET_NAME: 'S3_BUCKET_NAME',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    UserAgent: 'SOLUTION_USER_AGENT',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    PATTERN_EMAIL_MAPPING_TABLE_NAME: 'PATTERN_EMAIL_MAPPING_TABLE_NAME',
};
