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

import { Aws, Tags } from 'aws-cdk-lib';
import { IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import {
    Effect,
    PolicyDocument,
    PolicyStatement,
    Role,
    ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { IFunction, Function, FunctionProps, Tracing } from 'aws-cdk-lib/aws-lambda';
import { SqsDestination } from 'aws-cdk-lib/aws-lambda-destinations';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface AWSLambdaFunctionProps
    extends Omit<FunctionProps, 'allowPublicSubnet' | 'role' | 'vpc' | 'vpcSubnets'> {
    iamRoleName?: string;
    disableDefaultLambdaExecutionPolicy?: boolean;
    onFailure?: SqsDestination;
    subnetType?: SubnetType;
    vpc: IVpc;
    name: string;
}

export class AWSLambdaFunction extends Construct {
    public readonly lambdaFunction: IFunction;
    public readonly lambdaExecutionRole: Role;

    public constructor(scope: Construct, id: string, props: AWSLambdaFunctionProps) {
        super(scope, id);

        // Add the inline policy to enable lambda to call any other APIs
        // It is only necessary when a service is running in a different account
        // from team shared account and need to call its dependency services across-account
        // This is a wildcard policy as the APIGateway has resource policy to limit the access.
        const allowCrossAccountAPIPolicyDoc = new PolicyDocument({
            statements: [
                PolicyStatement.fromJson({
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    Effect: Effect.ALLOW,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    Action: 'execute-api:Invoke',
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    Resource: 'arn:aws:execute-api:*:*:*/*/*/*',
                }),
            ],
        });

        const allowSSMParamAccess = new PolicyStatement({
            resources: [`arn:aws:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/rapm/*`],
            effect: Effect.ALLOW,
            actions: [
                'ssm:DescribeParameters',
                'ssm:GetParameter',
                'ssm:GetParameterHistory',
                'ssm:GetParameters',
            ],
        });

        const logGroupStreamStatements = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['logs:CreateLogGroup', 'logs:CreateLogStream'],
            resources: [`arn:aws:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:*`],
        });
        const logGroupStatements = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['logs:PutLogEvents'],
            resources: [
                `arn:aws:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:*:log-stream:*`,
            ],
        });

        const ec2statements = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'ec2:CreateNetworkInterface',
                'ec2:DeleteNetworkInterface',
                'ec2:AssignPrivateIpAddresses',
                'ec2:UnassignPrivateIpAddresses',
            ],
            resources: [`arn:aws:ec2:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`],
        });
        // ec2:DescribeNetworkInterfaces doesn't support resource-level permission and has to use All resources
        const ec2NIstatements = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['ec2:DescribeNetworkInterfaces'],
            resources: ['*'],
        });

        const inlinePolicies: Record<string, PolicyDocument> | undefined = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            AllowCrossAccountApiPolicy: allowCrossAccountAPIPolicyDoc,
        };

        if (props.initialPolicy) {
            const initialPolicyDoc = new PolicyDocument({
                statements: props.initialPolicy,
            });
            inlinePolicies.CustomPolicy = initialPolicyDoc;
        }

        // One Lambda Function is by default provisioned
        this.lambdaExecutionRole = new Role(this, 'ExecutionRole', {
            ...(props.iamRoleName && { roleName: props.iamRoleName }),
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            description: `Lambda execution role for ${props.name}-${id}`,
            inlinePolicies: inlinePolicies,
        });

        this.lambdaExecutionRole.addToPolicy(ec2statements);
        this.lambdaExecutionRole.addToPolicy(ec2NIstatements);
        this.lambdaExecutionRole.addToPolicy(logGroupStatements);
        this.lambdaExecutionRole.addToPolicy(logGroupStreamStatements);
        this.lambdaExecutionRole.addToPolicy(allowSSMParamAccess);

        // tag the lambda execution role with service name (again) for attribute based access control
        Tags.of(this.lambdaExecutionRole).add('awsPattern:service', props.name);

        // security groups
        const securityGroups = (props.securityGroups ?? []).slice();

        // replace securityGroups in lambda if subnetSecurityGroup is found
        const lambdaProps =
            securityGroups.length === 0 ? props : { ...props, securityGroups };

        this.lambdaFunction = new Function(this, 'LambdaFunction', {
            ...lambdaProps,
            role: this.lambdaExecutionRole,
            vpc: props.vpc,
            vpcSubnets: {
                subnetType: props.subnetType ?? SubnetType.PRIVATE_WITH_EGRESS,
            },
            tracing: Tracing.ACTIVE,
        });

        NagSuppressions.addResourceSuppressions(
            this.lambdaExecutionRole,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The wildcard is used as suffix with specific IAM permissions',
                },
            ],
            true
        );
        NagSuppressions.addResourceSuppressions(
            this.lambdaFunction,
            [
                {
                    id: 'AwsSolutions-L1',
                    reason: 'Node 14 is still supported version and solution relies on this version.',
                },
            ],
            true
        );
    }
}
