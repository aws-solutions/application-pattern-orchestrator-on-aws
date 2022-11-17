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
   * @api {get} /subscriptions Get subscription for a pattern and email id
   * @apiName GetSubscription
   * @apiGroup Subscription
   * @apiDescription Returns subscription data for a pattern and email id
   * @apiVersion 1.0.0
   * @apiParam (Query string) {String} patternId Pattern Id
   * @apiParam (Query string) {String} email Subscriber's email address
   * 
   * @apiSuccessExample Success-Response:
   *      HTTP/1.1 200 OK
   *      {
             "email": "test@testdomain.com",
             "patternId": "test-pattern-id"
          }
   * @apiSampleRequest off
   */
@injectable()
export class GetSubscriptionHandler
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
        const patternId = event.queryStringParameters?.['patternId'];
        const email = event.queryStringParameters?.['email'];

        if (!patternId || !email) {
            return ServerlessResponse.ofObject(
                400,
                'patternId and email must not be null or empty.'
            );
        }

        const subs = await this.db.getNotificationSubscription(patternId, email);

        return subs
            ? ServerlessResponse.ofObject(200, subs)
            : ServerlessResponse.ofObject(404, {});
    }
}
