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
import { App, Aspects } from 'aws-cdk-lib';
import 'source-map-support/register';
import {
    BlueprintInfrastructureStack,
    BlueprintType,
} from '../lib/blueprint-infrastructure-stack';
import {
    CfnNagCustomResourceSuppressionAspect,
    CfnNagServiceRoleDefaultPolicyResourceSuppressionAspect,
} from '../lib/cfn-nag-suppression';

const app = new App();

const blueprintId: string = app.node.tryGetContext('blueprintId');
const blueprintType: BlueprintType = app.node.tryGetContext('blueprintType');

const blueprintInfrastructureSharedConfigJson = app.node.tryGetContext(
    'blueprintInfrastructureSharedConfigJson'
);

const githubRepositoryOwner = app.node.tryGetContext('githubRepositoryOwner');
const githubRepositoryName = app.node.tryGetContext('githubRepositoryName');
const githubRepositoryMainBranchName = app.node.tryGetContext(
    'githubRepositoryMainBranchName'
);
const githubConnectionArn = app.node.tryGetContext('githubConnectionArn');

const infraStack = new BlueprintInfrastructureStack(
    app,
    `BlueprintInfrastructureStack${blueprintId}`,
    {
        env: {
            region: process.env.CDK_DEFAULT_REGION,
            account: process.env.CDK_DEFAULT_ACCOUNT,
        },
        blueprintId,
        blueprintType,
        blueprintInfrastructureSharedConfigJson,
        githubRepositoryName,
        githubRepositoryOwner,
        githubRepositoryMainBranchName,
        githubConnectionArn,
        tags: {
            // The blueprint ID tag is used to update the corresponding blueprint infrastructure status in dynamodb
            blueprintId,
            blueprintType,
        },
    }
);
Aspects.of(infraStack).add(new CfnNagCustomResourceSuppressionAspect());
Aspects.of(infraStack).add(new CfnNagServiceRoleDefaultPolicyResourceSuppressionAspect());
