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
import {
    FlowLogDestination,
    InterfaceVpcEndpoint,
    InterfaceVpcEndpointAwsService,
    IVpc,
    SubnetType,
    Vpc,
} from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as route53resolver from 'aws-cdk-lib/aws-route53resolver';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
    Effect,
    Policy,
    PolicyStatement,
    Role,
    ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Key } from 'aws-cdk-lib/aws-kms';
import { addCfnNagSuppression } from './cfn-nag-suppression';
import { NagSuppressions } from 'cdk-nag';

const defaultSubnetConfiguration = [
    {
        cidrMask: 24,
        name: 'public',
        subnetType: SubnetType.PUBLIC,
        mapPublicIpOnLaunch: false,
    },
    {
        cidrMask: 24,
        name: 'service',
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
    },
];

export interface BlueprintBaseInfraProps {
    vpcCidr?: string;
    enableVPCEndpoints?: boolean;
    // Outbound resolver config
    githubDomain?: string;
    githubDomainResolverIpAddresses?: string;
}

export class BlueprintBaseInfra extends Construct {
    public vpc: IVpc;

    public constructor(scope: Construct, id: string, props: BlueprintBaseInfraProps) {
        super(scope, id);

        const vpcCidr = props.vpcCidr || Vpc.DEFAULT_CIDR_RANGE;
        const subnetConfig = defaultSubnetConfiguration;

        this.vpc = new Vpc(this, 'vpc', {
            cidr: vpcCidr,
            subnetConfiguration: subnetConfig,
            maxAzs: 2,
        });

        const infraConfig = new InfraConfig(this, 'InfraConfig');
        if (props.enableVPCEndpoints) {
            infraConfig.enableVPCEndpoints(this.vpc);
        }

        infraConfig.enableVpcFlowLog(this.vpc);

        if (props.githubDomain && props.githubDomainResolverIpAddresses) {
            this.createOutboundResolverEndpoint(
                props.githubDomain,
                props.githubDomainResolverIpAddresses
            );
        }
    }

    private createOutboundResolverEndpoint(
        githubDomain: string,
        githubDomainResolverIpAddresses: string
    ): void {
        const subnets = this.vpc.selectSubnets({
            subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            onePerAz: true,
        }).subnets;

        const subnetIds = subnets.map((subnet) => ({
            subnetId: subnet.subnetId,
        }));

        const outboundResolverSg = new ec2.SecurityGroup(this, 'outbound-resolver-sg', {
            vpc: this.vpc,
            description: 'security group for outbound resolver',
        });
        addCfnNagSuppression(outboundResolverSg, [
            {
                id: 'W40',
                reason: 'Needed for dns resolver',
            },
            {
                id: 'W5',
                reason: 'Needed for dns resolver',
            },
        ]);

        outboundResolverSg.addIngressRule(
            ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
            ec2.Port.tcp(53),
            'Allow outbound TCP DNS queries from VPC peering'
        );

        outboundResolverSg.addIngressRule(
            ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
            ec2.Port.udp(53),
            'Allow outbound UDP DNS queries from VPC peering'
        );

        const outboundResolver = new route53resolver.CfnResolverEndpoint(
            this,
            'outbound-resolver-endpoint',
            {
                direction: 'OUTBOUND',
                ipAddresses: subnetIds,
                securityGroupIds: [outboundResolverSg.securityGroupId],
                name: 'outboundResolverEndpoint',
            }
        );

        const targetIps = githubDomainResolverIpAddresses.split(',').map((targetIp) => ({
            ip: targetIp.trim(),
        }));
        const resolverRule = new route53resolver.CfnResolverRule(this, `resolver-rule`, {
            domainName: githubDomain,
            ruleType: 'FORWARD',
            resolverEndpointId: outboundResolver.attrResolverEndpointId,
            targetIps,
        });
        new route53resolver.CfnResolverRuleAssociation(
            this,
            `resolver-rule-association`,
            {
                resolverRuleId: resolverRule.attrResolverRuleId,
                vpcId: this.vpc.vpcId,
            }
        );
    }
}

export class InfraConfig extends Construct {
    public constructor(scope: Construct, id: string) {
        super(scope, id);
    }
    public enableVPCEndpoints(vpc: IVpc): void {
        const enableOpa = !!this.node.tryGetContext('enableOpa');
        if (enableOpa) {
            new InterfaceVpcEndpoint(this, 'vpcEndpointECR', {
                service: InterfaceVpcEndpointAwsService.ECR,
                vpc: vpc,
                lookupSupportedAzs: false,
                open: true,
                privateDnsEnabled: true,
                subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
            });

            new InterfaceVpcEndpoint(this, 'vpcEndpointEcrDocker', {
                service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
                vpc: vpc,
                lookupSupportedAzs: false,
                open: true,
                privateDnsEnabled: true,
                subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
            });

            new InterfaceVpcEndpoint(this, 'vpcEndpointELB', {
                service: InterfaceVpcEndpointAwsService.ELASTIC_LOAD_BALANCING,
                vpc: vpc,
                lookupSupportedAzs: false,
                open: true,
                privateDnsEnabled: true,
                subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
            });
        }

        new InterfaceVpcEndpoint(this, 'vpcEndpointEC2', {
            service: InterfaceVpcEndpointAwsService.EC2,
            vpc: vpc,
            lookupSupportedAzs: false,
            open: true,
            privateDnsEnabled: true,
            subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });

        new InterfaceVpcEndpoint(this, 'vpcEndpointEC2MESSAGES', {
            service: InterfaceVpcEndpointAwsService.EC2_MESSAGES,
            vpc: vpc,
            lookupSupportedAzs: false,
            open: true,
            privateDnsEnabled: true,
            subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });

        new InterfaceVpcEndpoint(this, 'vpcEndpointLambda', {
            service: InterfaceVpcEndpointAwsService.LAMBDA,
            vpc: vpc,
            lookupSupportedAzs: false,
            open: true,
            privateDnsEnabled: true,
            subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });

        new InterfaceVpcEndpoint(this, 'vpcEndpointSNS', {
            service: InterfaceVpcEndpointAwsService.SNS,
            vpc: vpc,
            lookupSupportedAzs: false,
            open: true,
            privateDnsEnabled: true,
            subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });

        new InterfaceVpcEndpoint(this, 'vpcEndpointKMS', {
            service: InterfaceVpcEndpointAwsService.KMS,
            vpc: vpc,
            lookupSupportedAzs: false,
            open: true,
            privateDnsEnabled: true,
            subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });
        new InterfaceVpcEndpoint(this, 'vpcEndpointCloudWatchLogs', {
            service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
            vpc: vpc,
            lookupSupportedAzs: false,
            open: true,
            privateDnsEnabled: true,
            subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });

        new InterfaceVpcEndpoint(this, 'vpcEndpointCloudWatch', {
            service: InterfaceVpcEndpointAwsService.CLOUDWATCH,
            vpc: vpc,
            lookupSupportedAzs: false,
            open: true,
            privateDnsEnabled: true,
            subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });

        new InterfaceVpcEndpoint(this, 'vpcEndpointAWSConfig', {
            service: InterfaceVpcEndpointAwsService.CONFIG,
            vpc,
            lookupSupportedAzs: false,
            open: true,
            privateDnsEnabled: true,
            subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });
    }

    public enableVpcFlowLog(vpc: IVpc): void {
        const encryptionKey = new Key(this, 'VpcFlowLogsKey', {
            removalPolicy: RemovalPolicy.DESTROY,
            enableKeyRotation: true,
        });
        encryptionKey.addToResourcePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                sid: 'Allow VPC Flow Logs to use the key',
                principals: [
                    new ServicePrincipal(`logs.${Stack.of(this).region}.amazonaws.com`),
                ],
                actions: [
                    'kms:ReEncrypt',
                    'kms:GenerateDataKey',
                    'kms:Encrypt',
                    'kms:DescribeKey',
                    'kms:Decrypt',
                ],
                resources: ['*'],
            })
        );

        const logGroup = new LogGroup(this, 'VpcFlowLogs', {
            retention: RetentionDays.TWO_WEEKS,
            encryptionKey: encryptionKey,
        });

        const logGroupRole = new Role(this, 'VpcFlowLogsRole', {
            assumedBy: new ServicePrincipal('vpc-flow-logs.amazonaws.com'),
        });

        const logGroupPolicy = new Policy(this, 'VpcFlowLogsPolicy');

        logGroupPolicy.addStatements(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                    'logs:DescribeLogGroups',
                    'logs:DescribeLogStreams',
                ],
                resources: [logGroup.logGroupArn],
            }),
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'kms:Encrypt*',
                    'kms:Decrypt*',
                    'kms:ReEncrypt*',
                    'kms:GenerateDataKey*',
                    'kms:Describe*',
                ],
                resources: [encryptionKey.keyArn],
            })
        );

        NagSuppressions.addResourceSuppressions(logGroupPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The wildcard is only used following the specific permission',
            },
        ]);

        logGroupPolicy.attachToRole(logGroupRole);

        vpc.addFlowLog('FlowLogsToCloudWatch', {
            destination: FlowLogDestination.toCloudWatchLogs(logGroup, logGroupRole),
        });
    }
}
