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
import * as cdk from 'aws-cdk-lib';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export interface ApiGatewayWidgetProps {
    apiName: string;
    endpoints: { method: string; resource: string; friendlyName?: string }[];
}

export interface LambdaWidgetProps {
    functionName: string;
    friendlyName?: string;
}

export interface DynamoDbWidgetProps {
    tableName: string;
    friendlyTableName?: string;
}

export interface AWSServiceDashboardProps {
    dashboardName?: string;
    serviceName: string;
    canaryName?: string;
    lambdas: LambdaWidgetProps[];
    apiGateway?: ApiGatewayWidgetProps;
    dynamoDbTables?: DynamoDbWidgetProps[];
    additionalWidgets?: cw.IWidget[];
}

export class AWSServiceDashboard extends Construct {
    public readonly dashboard: cw.Dashboard;
    public keyMetrics: Map<string, cw.IMetric>;

    public constructor(scope: Construct, id: string, props: AWSServiceDashboardProps) {
        super(scope, id);
        this.keyMetrics = new Map();
        const dashboard = new cw.Dashboard(this, `${props.serviceName}-dashboard`, {
            ...(props.dashboardName && { dashboardName: props.dashboardName }),
        });

        // canary and api gateway widgets
        if (props.apiGateway) {
            dashboard.addWidgets(
                ...this.createApiWidgets(props.apiGateway, props.canaryName)
            );
        }

        // lambda widgets
        dashboard.addWidgets(
            ...props.lambdas
                .map((lambda) => this.createLambdaWidgets(lambda))
                .reduce((previous, current) => previous.concat(current))
        );

        // dynamo db
        if (props.dynamoDbTables && props.dynamoDbTables.length > 0) {
            dashboard.addWidgets(
                ...props.dynamoDbTables
                    .map((table) => this.createDynamoDbWidgets(table))
                    .reduce((previous, current) => previous.concat(current))
            );
        }

        if (props.additionalWidgets && props.additionalWidgets.length > 0) {
            dashboard.addWidgets(...props.additionalWidgets);
        }
        this.dashboard = dashboard;
    }

    private createLambdaWidgets(lambda: LambdaWidgetProps): cw.IWidget[] {
        const prefix = lambda.friendlyName ?? lambda.functionName;
        const successRateMetrics = this.createSuccessRateMetrics(lambda);
        const maximumDurationMetrics = this.lambdaMetric(
            lambda,
            'Maximum',
            'Duration',
            cw.Statistic.MAXIMUM,
            cw.Unit.MILLISECONDS
        );
        const averageDurationMetrics = this.lambdaMetric(
            lambda,
            'Average',
            'Duration',
            cw.Statistic.AVERAGE,
            cw.Unit.MILLISECONDS
        );
        const minDurationMetrics = this.lambdaMetric(
            lambda,
            'Minimum',
            'Duration',
            cw.Statistic.MINIMUM,
            cw.Unit.MILLISECONDS
        );
        this.keyMetrics.set('SUCESS_RATE', successRateMetrics);

        return [
            this.lambdaWidget(`${prefix} - Duration`, [
                minDurationMetrics,
                maximumDurationMetrics,
                averageDurationMetrics,
            ]),
            this.createGraphWidget({
                title: `${prefix} -  Success Rate`,
                left: [successRateMetrics],
                leftYAxis: { max: 100, min: 0, label: 'Percent', showUnits: false },
            }),
        ];
    }

    private createSuccessRateMetrics(lambda: LambdaWidgetProps): cw.MathExpression {
        const invocations: cw.IMetric = this.lambdaMetric(
            lambda,
            'Invocations',
            'Invocations',
            cw.Statistic.SUM,
            cw.Unit.COUNT
        );

        const errorCount: cw.IMetric = this.lambdaMetric(
            lambda,
            'Error',
            'Errors',
            cw.Statistic.SUM,
            cw.Unit.COUNT
        );

        const successRateMetrics = new cw.MathExpression({
            expression: '100 - 100 * errors / MAX([errors, invocations])',
            usingMetrics: {
                errors: errorCount,
                invocations: invocations,
            },
            period: cdk.Duration.minutes(5),
            label: 'Success rate',
        });

        return successRateMetrics;
    }

    private createApiWidgets(
        apg: ApiGatewayWidgetProps,
        canaryName?: string
    ): cw.IWidget[] {
        const metrics = [];

        if (canaryName) {
            metrics.push(
                this.apiGatewayWidget('Canary Status', [
                    this.createGraphMetric({
                        metricName: 'SuccessPercent',
                        namespace: 'CloudWatchSynthetics',
                        label: 'Canary Status',
                        statistic: cw.Statistic.AVERAGE,
                        unit: cw.Unit.PERCENT,
                        dimensionsMap: { CanaryName: canaryName },
                    }),
                ])
            );
        }

        metrics.push(
            this.apiGatewayWidget(
                'API Invocation',
                apg.endpoints.map((api) =>
                    this.apiGatewayMetric(
                        apg.apiName,
                        api.friendlyName ?? `${api.method} ${api.resource}`,
                        'Count',
                        cw.Statistic.SUM,
                        cw.Unit.COUNT,
                        api.method,
                        api.resource
                    )
                )
            ),
            this.apiGatewayWidget(
                'API Latency',
                apg.endpoints.map((api) =>
                    this.apiGatewayMetric(
                        apg.apiName,
                        api.friendlyName ?? `${api.method} ${api.resource}`,
                        'Latency',
                        cw.Statistic.AVERAGE,
                        cw.Unit.MILLISECONDS,
                        api.method,
                        api.resource
                    )
                )
            ),
            this.apiGatewayWidget(
                'API Errors',
                apg.endpoints.map((api) =>
                    this.apiGatewayMetric(
                        apg.apiName,
                        api.friendlyName ?? `${api.method} ${api.resource}`,
                        '4XXError',
                        cw.Statistic.SUM,
                        cw.Unit.COUNT,
                        api.method,
                        api.resource
                    )
                ),
                apg.endpoints.map((api) =>
                    this.apiGatewayMetric(
                        apg.apiName,
                        api.friendlyName ?? `${api.method} ${api.resource}`,
                        '5XXError',
                        cw.Statistic.SUM,
                        cw.Unit.COUNT,
                        api.method,
                        api.resource
                    )
                ),
                '4XX Errors',
                '5XX Errors'
            )
        );

        return metrics;
    }

    private lambdaWidget(title: string, metrics: cw.IMetric[]): cw.IWidget {
        return this.createGraphWidget({ title, left: metrics });
    }

    private lambdaMetric(
        lambda: LambdaWidgetProps,
        label: string,
        metricName: string,
        statistic: cw.Statistic,
        unit?: cw.Unit
    ): cw.IMetric {
        return this.createGraphMetric({
            label,
            metricName,
            namespace: 'AWS/Lambda',
            statistic,
            unit,
            dimensionsMap: { FunctionName: lambda.functionName },
        });
    }

    private createDynamoDbWidgets(dynamoDbTable: DynamoDbWidgetProps): cw.IWidget[] {
        const prefix = dynamoDbTable.friendlyTableName ?? dynamoDbTable.tableName;
        return [
            this.ddbWidget(`${prefix} - Capacity`, [
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Provisioned Read',
                    'ProvisionedReadCapacityUnits',
                    cw.Statistic.AVERAGE,
                    cw.Unit.COUNT
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Consumed Read',
                    'ConsumedReadCapacityUnits',
                    cw.Statistic.AVERAGE,
                    cw.Unit.COUNT
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Provisioned Read',
                    'ProvisionedWriteCapacityUnits',
                    cw.Statistic.AVERAGE,
                    cw.Unit.COUNT
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Consumed Read',
                    'ConsumedWriteCapacityUnits',
                    cw.Statistic.AVERAGE,
                    cw.Unit.COUNT
                ),
            ]),
            this.ddbWidget(`${prefix} - Latency`, [
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Get Latency',
                    'SuccessfulRequestLatency',
                    cw.Statistic.AVERAGE,
                    cw.Unit.MILLISECONDS,
                    { Operation: 'GetItem' }
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Put Latency',
                    'SuccessfulRequestLatency',
                    cw.Statistic.AVERAGE,
                    cw.Unit.MILLISECONDS,
                    { Operation: 'PutItem' }
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Scan Latency',
                    'SuccessfulRequestLatency',
                    cw.Statistic.AVERAGE,
                    cw.Unit.MILLISECONDS,
                    { Operation: 'Scan' }
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Query Latency',
                    'SuccessfulRequestLatency',
                    cw.Statistic.AVERAGE,
                    cw.Unit.MILLISECONDS,
                    { Operation: 'Query' }
                ),
            ]),
            this.ddbWidget(`${prefix} - Errors`, [
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Get',
                    'SystemErrors',
                    cw.Statistic.SUM,
                    cw.Unit.COUNT,
                    {
                        Operation: 'GetItem',
                    }
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Batch Get',
                    'SystemErrors',
                    cw.Statistic.SUM,
                    cw.Unit.COUNT,
                    {
                        Operation: 'BatchGetItem',
                    }
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Scan',
                    'SystemErrors',
                    cw.Statistic.SUM,
                    cw.Unit.COUNT,
                    {
                        Operation: 'Scan',
                    }
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Query',
                    'SystemErrors',
                    cw.Statistic.SUM,
                    cw.Unit.COUNT,
                    {
                        Operation: 'Query',
                    }
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Put',
                    'SystemErrors',
                    cw.Statistic.SUM,
                    cw.Unit.COUNT,
                    {
                        Operation: 'PutItem',
                    }
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Batch Write',
                    'SystemErrors',
                    cw.Statistic.SUM,
                    cw.Unit.COUNT,
                    {
                        Operation: 'BatchWriteItem',
                    }
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Update',
                    'SystemErrors',
                    cw.Statistic.SUM,
                    cw.Unit.COUNT,
                    {
                        Operation: 'UpdateItem',
                    }
                ),
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Delete',
                    'SystemErrors',
                    cw.Statistic.SUM,
                    cw.Unit.COUNT,
                    {
                        Operation: 'DeleteItem',
                    }
                ),
            ]),
            this.ddbWidget(`${prefix} - Throttled Requests`, [
                this.ddbMetric(
                    dynamoDbTable.tableName,
                    'Throttled Requests',
                    'ThrottledRequests',
                    cw.Statistic.SUM,
                    cw.Unit.COUNT
                ),
            ]),
        ];
    }

    private ddbMetric(
        tableName: string,
        label: string,
        metricName: string,
        statistic: cw.Statistic,
        unit?: cw.Unit,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dimensions?: Record<string, any>
    ): cw.IMetric {
        return this.createGraphMetric({
            label,
            metricName,
            statistic,
            namespace: 'AWS/DynamoDB',
            unit,
            dimensionsMap: { ...dimensions, TableName: tableName },
        });
    }

    private ddbWidget(title: string, metrics: cw.IMetric[]): cw.IWidget {
        return this.createGraphWidget({ title, left: metrics });
    }

    private apiGatewayWidget(
        title: string,
        leftMetrics: cw.IMetric[],
        rightMetrics?: cw.IMetric[],
        leftLabel?: string,
        rightLabel?: string
    ): cw.IWidget {
        return this.createGraphWidget({
            title,
            left: leftMetrics,
            right: rightMetrics,
            leftYAxis: { label: leftLabel },
            rightYAxis: { label: rightLabel },
        });
    }

    private apiGatewayMetric(
        apiName: string,
        label: string,
        metricName: string,
        statistic: cw.Statistic,
        unit: cw.Unit,
        method: string,
        resource: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dimensions?: Record<string, any>
    ): cw.IMetric {
        return this.createGraphMetric({
            label,
            metricName,
            statistic,
            unit,
            namespace: 'AWS/ApiGateway',
            dimensionsMap: {
                ...dimensions,
                ApiName: apiName,
                Stage: 'prod',
                Method: method,
                Resource: resource,
            },
        });
    }

    private createGraphWidget(props: cw.GraphWidgetProps): cw.GraphWidget {
        return new cw.GraphWidget({ height: 6, width: 6, liveData: true, ...props });
    }

    private createGraphMetric(props: cw.MetricProps): cw.IMetric {
        return new cw.Metric(props);
    }
}
