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

import { MethodOptions, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

/**
 * Blueprint api definition props
 */
export interface BlueprintApiDefinitionProps {
    blueprintApiGateway: RestApi;
    methodProps: MethodOptions;
}

/**
 * Blueprint api definition
 */
export class BlueprintApiDefinition extends Construct {
    public constructor(scope: Construct, id: string, props: BlueprintApiDefinitionProps) {
        super(scope, id);

        const blueprintsResource = props.blueprintApiGateway.root.addResource('patterns');

        blueprintsResource.addMethod('GET', undefined, props.methodProps);
        blueprintsResource.addMethod('POST', undefined, props.methodProps);

        const blueprintPipelineResource = blueprintsResource.addResource('pipeline');
        const blueprintPipelineResourceID = blueprintPipelineResource.addResource('{id}');

        blueprintPipelineResourceID.addMethod('PUT', undefined, props.methodProps);

        const blueprintIdResource = blueprintsResource.addResource('{id}');
        blueprintIdResource.addMethod('PUT', undefined, props.methodProps);

        blueprintIdResource.addMethod('GET', undefined, props.methodProps);

        // Attribute Resource
        const attributesResource =
            props.blueprintApiGateway.root.addResource('attributes');
        // List method
        attributesResource.addMethod('GET', undefined, props.methodProps);
        // Create method
        attributesResource.addMethod('POST', undefined, props.methodProps);
        // individual resource
        const attributeResource = attributesResource.addResource('{id}');
        // GetDetail method
        attributeResource.addMethod('GET', undefined, props.methodProps);
        // Update method
        attributeResource.addMethod('PUT', undefined, props.methodProps);
        // Delete method
        attributeResource.addMethod('DELETE', undefined, props.methodProps);

        // subscriptions resource
        const subsResource = props.blueprintApiGateway.root.addResource('subscriptions');
        subsResource.addMethod('POST', undefined, props.methodProps);
        subsResource.addMethod('DELETE', undefined, props.methodProps);
        subsResource.addMethod('GET', undefined, props.methodProps);
    }
}
