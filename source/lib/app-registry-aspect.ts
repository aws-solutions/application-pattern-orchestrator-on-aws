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
import * as cdk from 'aws-cdk-lib';
import * as appInsights from 'aws-cdk-lib/aws-applicationinsights';
import * as appRegistry from '@aws-cdk/aws-servicecatalogappregistry-alpha';
import { Construct, IConstruct } from 'constructs';

export interface AppRegistryProps {
    solutionName: string;
    solutionId: string;
    solutionVersion: string;
    applicationType: string;
    applicationName: string;
}

export class AppRegistry extends Construct implements cdk.IAspect {
    public constructor(
        scope: Construct,
        id: string,
        private readonly props: AppRegistryProps
    ) {
        super(scope, id);
    }

    public visit(node: IConstruct): void {
        if (!(node instanceof cdk.Stack)) {
            return;
        }

        const application = this.createAppForAppRegistry();

        if (!node.nested) {
            // it's a root stack, associate the stack with the app, create attribute group and tag it
            const stack = node as cdk.Stack;
            application.associateApplicationWithStack(stack);
            this.createAttributeGroup(application);
            this.addTagsforApplication(application);
            this.createAppForAppInsights(application);
        } else {
            // it's a nested stack, only associate the stack with the app
            application.associateApplicationWithStack(node);
        }
    }

    private createAppForAppRegistry(): appRegistry.Application {
        return new appRegistry.Application(this, 'RegistrySetup', {
            applicationName: cdk.Fn.join('-', [
                this.props.applicationName,
                cdk.Aws.REGION,
                cdk.Aws.ACCOUNT_ID,
            ]),
            description: `Service Catalog application to track and manage all your resources for the solution ${this.props.solutionName}`,
        });
    }

    private addTagsforApplication(application: appRegistry.Application): void {
        cdk.Tags.of(application).add('Solutions:SolutionID', this.props.solutionId);
        cdk.Tags.of(application).add('Solutions:SolutionName', this.props.solutionName);
        cdk.Tags.of(application).add(
            'Solutions:SolutionVersion',
            this.props.solutionVersion
        );
        cdk.Tags.of(application).add(
            'Solutions:ApplicationType',
            this.props.applicationType
        );
    }

    private createAttributeGroup(application: appRegistry.Application): void {
        application.associateAttributeGroup(
            new appRegistry.AttributeGroup(this, 'AppAttributes', {
                attributeGroupName: cdk.Aws.STACK_NAME,
                description: 'Attributes for Solutions Metadata',
                attributes: {
                    applicationType: this.props.applicationType,
                    version: this.props.solutionVersion,
                    solutionID: this.props.solutionId,
                    solutionName: this.props.solutionName,
                },
            })
        );
    }

    private createAppForAppInsights(application: appRegistry.Application): void {
        new appInsights.CfnApplication(this, 'AppInsightsSetup', {
            resourceGroupName: cdk.Fn.join('-', [
                'AWS_AppRegistry_Application',
                this.props.applicationName,
                cdk.Aws.REGION,
                cdk.Aws.ACCOUNT_ID,
            ]),
            autoConfigurationEnabled: true,
            cweMonitorEnabled: true,
            opsCenterEnabled: true,
        }).addDependsOn(application.node.defaultChild as cdk.CfnResource);
    }
}
