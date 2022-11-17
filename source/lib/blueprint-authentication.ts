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
import { Aws, CfnOutput, RemovalPolicy, SecretValue } from 'aws-cdk-lib';
import {
    CfnIdentityPool,
    CfnIdentityPoolRoleAttachment,
    CfnUserPoolIdentityProvider,
    CfnUserPoolUser,
    StringAttribute,
    UserPool,
    UserPoolClient,
    UserPoolClientIdentityProvider,
} from 'aws-cdk-lib/aws-cognito';
import { FederatedPrincipal, ManagedPolicy, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { IdentityProviderInfo, OidcAuthorizeScope } from './blueprint-types';
import { passwordPolicy } from './constants';
import { URL, parse } from 'url';
import { NagSuppressions } from 'cdk-nag';
export interface BlueprintAuthenticationProps {
    readonly adminEmail: string;
    readonly solutionName: string;
    readonly cloudFrontDomainName: string;
    readonly cognitoDomainPrefix?: string;
    readonly anonymousDataUUID: string;
    readonly identityProviderInfo?: IdentityProviderInfo;
    readonly removalPolicy: RemovalPolicy;
}

export class BlueprintAuthentication extends Construct {
    public readonly userPoolArn: string;
    public readonly appClientId: string;
    public readonly userPoolId: string;
    public readonly identityPoolId: string;
    public readonly cognitoDomain: string;

    public constructor(
        scope: Construct,
        id: string,
        props: BlueprintAuthenticationProps
    ) {
        super(scope, id);

        this.validateInputProps(props);

        const userPool = new UserPool(this, 'UserPool', {
            userInvitation: {
                emailSubject: `Welcome to ${props.solutionName}`,
                emailBody: `
                <p>
                   Please use the credentials below to login to the ${props.solutionName} UI.
                </p>
                <p>
                    Username: <strong>{username}</strong>
                </p>
                <p>
                    Temporary Password: <strong>{####}</strong>
                </p>
                <p>
                    Solution UI: <strong>https://${props.cloudFrontDomainName}/</strong>
                </p>
              `,
            },
            selfSignUpEnabled: false,
            signInAliases: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
            },
            passwordPolicy: passwordPolicy,
            autoVerify: {
                email: true,
            },
            customAttributes: { roles: new StringAttribute({ mutable: true }) },
            removalPolicy: props.removalPolicy,
        });

        NagSuppressions.addResourceSuppressions(userPool, [
            {
                id: 'AwsSolutions-COG2',
                reason: 'Suppressing the warnings MFA is subjected to customer usecase',
            },
            {
                id: 'AwsSolutions-COG3',
                reason: 'Advanced security mode needs to be configured - suppressed as it is not a requirement',
            },
        ]);

        const cognitoDomainPrefix = props.cognitoDomainPrefix ?? 'rapmwebui';
        // NOTE: for now support only cognito domain prefix, can be extedned to add support for custom domains
        const domain = userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: `${cognitoDomainPrefix}-${props.anonymousDataUUID}`,
            },
        });

        this.cognitoDomain = `${domain.domainName}.auth.${Aws.REGION}.amazoncognito.com`;

        let identityProvider = undefined;
        if (props.identityProviderInfo) {
            const identityProviderInfo = props.identityProviderInfo;

            let clientSecret = undefined;
            if (identityProviderInfo.clientSecretArn) {
                clientSecret = SecretValue.secretsManager(
                    identityProviderInfo.clientSecretArn
                );
            }
            identityProvider = new CfnUserPoolIdentityProvider(this, 'IdentityProvider', {
                providerName: identityProviderInfo.providerName,
                providerType: 'OIDC',
                userPoolId: userPool.userPoolId,
                /* eslint-disable @typescript-eslint/naming-convention */
                providerDetails: {
                    client_id: identityProviderInfo.clientId,
                    ...(clientSecret ? { client_secret: clientSecret.toString() } : {}),
                    attributes_request_method:
                        identityProviderInfo.attributesRequestMethod ?? 'GET',
                    oidc_issuer: identityProviderInfo.oidcIssuer,
                    authorize_scopes: identityProviderInfo.authorizeScopes.join(' '),
                },
                /* eslint-ensable @typescript-eslint/naming-convention */
                ...(identityProviderInfo.attributeMapping
                    ? { attributeMapping: identityProviderInfo.attributeMapping }
                    : {}),
            });
        }

        // customDomain is not currently supported by the solution, it is added here for future extension
        const customDomain = this.node.tryGetContext('customDomain');
        const redirectUris = [
            // local development environment
            'http://localhost:3000',
            ...(customDomain
                ? [`https://${customDomain}`]
                : [`https://${props.cloudFrontDomainName}`]),
        ];

        // the front-end app client
        const client = userPool.addClient('AppClient', {
            authFlows: { userSrp: true, custom: true },
            enableTokenRevocation: true,
            supportedIdentityProviders: [
                UserPoolClientIdentityProvider.COGNITO,
                ...(props.identityProviderInfo?.providerName
                    ? [
                          UserPoolClientIdentityProvider.custom(
                              props.identityProviderInfo.providerName
                          ),
                      ]
                    : []),
            ],
            oAuth: {
                flows: { authorizationCodeGrant: true },
                callbackUrls: redirectUris,
                logoutUrls: redirectUris,
            },
        });

        if (identityProvider) {
            client.node.addDependency(identityProvider);
        }

        const adminUserAttributes = [
            { name: 'email_verified', value: 'true' },
            { name: 'email', value: props.adminEmail },
        ];

        new CfnUserPoolUser(this, 'AdminUser', {
            userPoolId: userPool.userPoolId,
            desiredDeliveryMediums: ['EMAIL'],
            forceAliasCreation: true,
            userAttributes: adminUserAttributes,
            username: props.adminEmail,
        });

        const identityPool = this.buildIdentityPool(userPool, client);

        identityPool.cfnOptions.metadata = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            cfn_nag: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                rules_to_suppress: [
                    {
                        id: 'W57',
                        reason: 'Use case allows unauthenticated users to access S3 objects',
                    },
                ],
            },
        };

        const authenticatedRole = this.buildAuthRole(identityPool);

        const publicRole = this.buildPublicRole(identityPool);

        new CfnIdentityPoolRoleAttachment(this, 'AuthRoleAttachment', {
            identityPoolId: identityPool.ref,
            roles: {
                authenticated: authenticatedRole.roleArn,
                unauthenticated: publicRole.roleArn,
            },
        });

        /**
         * Outputs
         */
        this.userPoolArn = userPool.userPoolArn;
        this.appClientId = client.userPoolClientId;
        this.userPoolId = userPool.userPoolId;
        this.identityPoolId = identityPool.ref;

        new CfnOutput(this, 'CognitoDomain', {
            value: this.cognitoDomain,
            description: 'Cognito hosted domain',
        });
    }

    private buildIdentityPool(
        userPool: UserPool,
        client: UserPoolClient
    ): CfnIdentityPool {
        return new CfnIdentityPool(this, 'IdentityPool', {
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: client.userPoolClientId,
                    providerName: userPool.userPoolProviderName,
                    serverSideTokenCheck: true,
                },
            ],
        });
    }

    private buildPublicRole(identityPool: CfnIdentityPool): Role {
        const publicRole = this.buildIdentityPoolRole(
            'CognitoPublicRole',
            'unauthenticated',
            identityPool
        );
        return publicRole;
    }

    private buildAuthRole(identityPool: CfnIdentityPool): Role {
        const authRole = this.buildIdentityPoolRole(
            'CognitoAuthRole',
            'authenticated',
            identityPool
        );

        authRole.addManagedPolicy(
            ManagedPolicy.fromAwsManagedPolicyName('AmazonAPIGatewayInvokeFullAccess')
        );
        NagSuppressions.addResourceSuppressions(authRole, [
            {
                id: 'AwsSolutions-IAM4',
                reason: "Need managed policy AmazonAPIGatewayInvokeFullAccess to invole API's",
            },
        ]);

        return authRole;
    }

    private buildIdentityPoolRole(
        name: string,
        type: 'authenticated' | 'unauthenticated',
        identityPool: CfnIdentityPool
    ): Role {
        return new Role(this, name, {
            assumedBy: new FederatedPrincipal(
                'cognito-identity.amazonaws.com',
                {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    StringEquals: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        'cognito-identity.amazonaws.com:aud': identityPool.ref,
                    },
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'ForAnyValue:StringLike': {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        'cognito-identity.amazonaws.com:amr': type,
                    },
                },
                'sts:AssumeRoleWithWebIdentity'
            ),
        });
    }

    private validateInputProps(props: BlueprintAuthenticationProps): void {
        if (props.identityProviderInfo) {
            const identityProviderInfo = props.identityProviderInfo;

            if (!this.isValidIssuerUri(identityProviderInfo.oidcIssuer)) {
                throw new Error(
                    'Invalid issuerUri. Please specify a valid issuerUri in cdk.json.'
                );
            }

            const authorizeScopes = identityProviderInfo.authorizeScopes;
            const mustHaveScopes: OidcAuthorizeScope[] = ['openid', 'profile'];
            if (!mustHaveScopes.every((scope) => authorizeScopes.includes(scope))) {
                throw new Error(
                    'Invalid authorize scopes. Please specify valid authorize scopes which should contain openid and profile in cdk.json.'
                );
            }
        }
    }

    private isValidIssuerUri(issuerUri: string): boolean {
        try {
            new URL(issuerUri);
            const parsedUri = parse(issuerUri);
            return parsedUri.protocol === 'https:' || parsedUri.protocol === 'http:';
        } catch (err) {
            return false;
        }
    }
}
