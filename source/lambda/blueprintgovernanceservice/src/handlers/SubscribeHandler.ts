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
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { inject, injectable } from 'tsyringe';
import { AsyncRequestHandler } from '../common/AsyncRequestHandler';
import { ServerlessResponse } from '../common/ServerlessResponse';
import { BlueprintDBService } from '../service/BlueprintDBService';

/**
 * @api {post} /subscriptions Create notification subscription
 * @apiName SubscriptionCreate
 * @apiGroup Subscription
 * @apiDescription Creates a new notification subscription
 * @apiVersion 1.0.0
 *
 * @apiParam {UUID} patternId The pattern's id.
 * @apiParam {String} email The subscription destination email address.
 * 
 * @apiUse InvalidParams
 * @apiUse InternalServerError
 * @apiSampleRequest off

 */

/**
 * @api {delete} /subscriptions Delete notification subscription
 * @apiName SubscriptionCreate
 * @apiGroup Subscription
 * @apiDescription Deletes a notification subscription
 * @apiVersion 1.0.0
 *
 * @apiParam {UUID} patternId The pattern's id.
 * @apiParam {String} email The subscription destination email address.
 * 
 * @apiUse InvalidParams
 * @apiUse InternalServerError
 * @apiSampleRequest off

 */

@injectable()
export class SubscribeHandler
    implements AsyncRequestHandler<APIGatewayProxyEvent, ServerlessResponse>
{
    public constructor(
        @inject('BlueprintDBService') private readonly db: BlueprintDBService
    ) {}

    public async handle(
        event: APIGatewayProxyEvent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _context: Context
    ): Promise<ServerlessResponse> {
        try {
            if (!event.body) {
                return ServerlessResponse.ofObject(
                    400,
                    'Request body must contain valid JSON.'
                );
            }

            const input = JSON.parse(event.body);

            if (!input.patternId) {
                return ServerlessResponse.ofObject(
                    400,
                    'patternId must not be null or empty.'
                );
            }

            if (
                !input.email ||
                // eslint-disable-next-line no-useless-escape
                !/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+([^<>()\.,;:\s@\"]{2,}|[\d\.]+))$/.test(
                    input.email
                )
            ) {
                return ServerlessResponse.ofObject(400, 'email must be valid.');
            }

            switch (event.httpMethod) {
                case 'POST':
                    await this.db.createNotificationSubscription(
                        input.patternId,
                        input.email
                    );
                    return ServerlessResponse.ofObject(201, {});
                case 'DELETE':
                    await this.db.deleteNotificationSubscription(
                        input.patternId,
                        input.email
                    );
                    return ServerlessResponse.ofObject(200, {});
                default:
                    return ServerlessResponse.ofObject(404, {});
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                // json parse error
                return ServerlessResponse.ofObject(
                    400,
                    'Request body must contain valid JSON.'
                );
            }
            throw error;
        }
    }
}
