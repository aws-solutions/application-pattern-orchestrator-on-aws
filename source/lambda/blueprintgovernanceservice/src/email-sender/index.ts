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
import * as lambda from 'aws-lambda';
import * as ses from '@aws-sdk/client-ses';
import * as ddb from '@aws-sdk/client-dynamodb';
import * as ddbUtils from '@aws-sdk/util-dynamodb';
import { awsSdkV3Configuration } from '../common/customUserAgent';
import { getLogger } from '../common/BaseContainer';
import { Logger } from '../common/logging/logger-type';

const emailClient = new ses.SESClient(awsSdkV3Configuration);
const ddbClient = new ddb.DynamoDBClient(awsSdkV3Configuration);

const tableName = process.env.MAPPING_TABLE;
const templateName = process.env.TEMPLATE_NAME;

interface EmailMapping {
    patternId: string;
    email: string;
}

export interface RAPMMessage {
    patternId: string;
    patternName: string;
    patternDescription: string;
    patternAttributes: Record<string, string>;
    patternUri: string;
    commitMessage: string;
    commitId: string;
    sourceRepo: string;
    modifiedPackages: { name: string; version: string }[];
    codeArtifact?: {
        //only applicable to cdk patterns
        account: string;
        region: string;
        domain: string;
        repository: string;
    };
    serviceCatalog?: {
        //only applicable to cfn patterns
        account: string;
        region: string;
        products: string[];
    };
}

export async function handler(
    event: lambda.SNSEvent,
    context: lambda.Context
): Promise<void> {
    const logger = getLogger('email-sender');

    logger.debug(
        `Processing event ${JSON.stringify(event)} with context ${JSON.stringify(
            context
        )}`
    );

    // parsing the sns message
    const messages = event.Records.map((x) => JSON.parse(x.Sns.Message) as RAPMMessage);

    if (messages.length < 1) {
        return;
    }

    // get sender email
    const fromEmail = await getSenderAddress(logger);

    await Promise.all(
        messages.map(async (x) => {
            // pull destination email addresses from dynamodb
            const recipients = await getRecipientsForPattern(x.patternId);

            if (recipients.length === 0) {
                //doing nothing
                return;
            }

            let patternDestination = '';
            if (x.serviceCatalog) {
                const serviceCatalogProducts = x.serviceCatalog.products.map(
                    (p) => `<li>Service Catalog product name: ${p}</li>
                `
                );
                patternDestination = `
                <ul>
                    <li>Account: ${x.serviceCatalog.account}</li>
                    <li>Region: ${x.serviceCatalog.region}</li>
                    ${serviceCatalogProducts.join(' ')}
                </ul>
            `;
            } else if (x.codeArtifact) {
                patternDestination = `
                <ul>
                    <li>Account: ${x.codeArtifact.account}</li>
                    <li>Region: ${x.codeArtifact.region}</li>
                    <li>CodeArtifact domain name: ${x.codeArtifact.domain}</li>
                    <li>CodeArtifact repository name: ${x.codeArtifact.repository}</li>
                </ul>
                `;
            }

            const templateData = {
                patternName: x.patternName,
                patternAttributes: `<ul>${Object.keys(x.patternAttributes)
                    .map((a) => `<li>${a}: ${x.patternAttributes[a]}</li>`)
                    .join('')}</ul>`,
                patternUri: x.patternUri,
                patternDescription: x.patternDescription,
                commitMessage: x.commitMessage,
                commitId: x.commitId,
                sourceRepo: x.sourceRepo,
                modifiedPackages: `<ul>${x.modifiedPackages
                    .map((p) => `<li>Name ${p.name} | Version ${p.version}</li>`)
                    .join('')}</ul>`,
                patternDestination,
            };

            logger.verbose(
                `Sending an email from ${fromEmail} to ${recipients
                    .map((x) => x)
                    .join(
                        ', '
                    )} using teamplate name ${templateName} with teampate data ${JSON.stringify(
                    templateData
                )}`
            );

            const batches = splitIntoBatches(recipients, 50); // making sure the list of recipients is within SES limit

            await Promise.all(
                batches.map(async (b) => {
                    /* eslint-disable @typescript-eslint/naming-convention */
                    const sendResult = await emailClient.send(
                        new ses.SendTemplatedEmailCommand({
                            Template: templateName,
                            Source: fromEmail,
                            Destination: { ToAddresses: b },
                            TemplateData: JSON.stringify(templateData),
                        })
                    );
                    /* eslint-enable @typescript-eslint/naming-convention */

                    logger.debug(`Send email result ${JSON.stringify(sendResult)}`);
                })
            );
        })
    );
}

async function getSenderAddress(logger: Logger): Promise<string> {
    const emails = await emailClient.send(new ses.ListVerifiedEmailAddressesCommand({}));

    logger.verbose(JSON.stringify(emails.VerifiedEmailAddresses));

    // picks the first one
    if (!emails.VerifiedEmailAddresses || emails.VerifiedEmailAddresses.length < 1) {
        throw new Error('No verified email addresses found');
    }

    return emails.VerifiedEmailAddresses[0];
}

async function getRecipientsForPattern(patternId: string): Promise<string[]> {
    const recipients = await ddbClient.send(
        /* eslint-disable @typescript-eslint/naming-convention */
        new ddb.QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'patternId = :patternId',
            ExpressionAttributeValues: {
                ':patternId': { S: patternId },
            },
        })
        /* eslint-enable @typescript-eslint/naming-convention */
    );

    if (!recipients.Items) {
        return [];
    }

    return recipients.Items.map((x) => {
        const unmarshalledObj = ddbUtils.unmarshall(x) as EmailMapping;
        return unmarshalledObj.email;
    });
}

export function splitIntoBatches<T>(input: T[], size: number): T[][] {
    const batches: T[][] = [];

    batches.push([...input.splice(0, size)]);

    while (input.length > size || input.length > 0) {
        batches.push([...input.splice(0, size)]);
    }

    return batches;
}
