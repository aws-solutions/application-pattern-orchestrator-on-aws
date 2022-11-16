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
import { AWSServiceDashboard } from './infra-utils/aws-service-dashboard';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import { Stack } from 'aws-cdk-lib';

export type LambdaFunctionDashboardProps = { functionName: string; friendlyName: string };

export type DynamoDBDashboardProps = { tableName: string; friendlyName: string };

export interface BlueprintDashboardProps {
    apiName: string;
    solutionName: string;
    lambdaFunctions: LambdaFunctionDashboardProps[];
    dynamoDBTables: DynamoDBDashboardProps[];
}

export class BlueprintDashboard extends Construct {
    public constructor(scope: Construct, id: string, props: BlueprintDashboardProps) {
        super(scope, id);

        const sesWidget = new cw.GraphWidget({
            title: 'SES',
            height: 6,
            width: 6,
            liveData: true,
            left: [
                new cw.Metric({
                    label: 'Send',
                    namespace: 'AWS/SES',
                    metricName: 'Send',
                    statistic: cw.Statistic.AVERAGE,
                    region: Stack.of(this).region,
                    account: Stack.of(this).account,
                }),
                new cw.Metric({
                    label: 'Bounce',
                    namespace: 'AWS/SES',
                    metricName: 'Reputation.BounceRate',
                    statistic: cw.Statistic.AVERAGE,
                    region: Stack.of(this).region,
                    account: Stack.of(this).account,
                }),
                new cw.Metric({
                    label: 'RenderingFailure',
                    namespace: 'AWS/SES',
                    metricName: 'RenderingFailure',
                    statistic: cw.Statistic.AVERAGE,
                    region: Stack.of(this).region,
                    account: Stack.of(this).account,
                }),
            ],
        });

        new AWSServiceDashboard(this, 'rapm-dashboard', {
            apiGateway: {
                apiName: props.apiName,
                endpoints: [
                    { method: 'GET', resource: '/blueprints' },
                    { method: 'POST', resource: '/blueprints' },
                    { method: 'PUT', resource: '/blueprints/pipeline/{id}' },

                    { method: 'GET', resource: '/blueprints/{id}' },
                    { method: 'PUT', resource: '/blueprints/{id}' },

                    { method: 'GET', resource: '/blueprints/{id}/versions/{version}' },
                    { method: 'PUT', resource: '/blueprints/{id}/versions/{version}' },

                    { method: 'GET', resource: '/attributes' },
                    { method: 'POST', resource: '/attributes' },

                    { method: 'GET', resource: '/attributes/{id}' },
                    { method: 'PUT', resource: '/attributes/{id}' },
                    { method: 'DELETE', resource: '/attributes/{id}' },

                    { method: 'GET', resource: '/artifacts/{file}' },

                    { method: 'GET', resource: '/subscriptions' },
                    { method: 'POST', resource: '/subscriptions' },
                    { method: 'DELETE', resource: '/subscriptions' },
                ],
            },
            serviceName: props.solutionName,
            lambdas: props.lambdaFunctions.map((x) => {
                return { functionName: x.functionName, friendlyName: x.friendlyName };
            }),
            dynamoDbTables: props.dynamoDBTables,
            additionalWidgets: [sesWidget],
        });
    }
}
