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
import { FunctionComponent, useEffect, useState } from 'react';
import { Auth, Logger, Cache } from 'aws-amplify';
import { Box, Button, Modal } from 'aws-northstar';
import { useAppContext } from '../AppContext';

const logger = new Logger('Authenticator');

export const Authenticate: FunctionComponent = ({ children }) => {
    const { user, setUser } = useAppContext();
    const [signingIn, setSigningIn] = useState(false);

    useEffect(() => {
        logger.debug('rendering Authenticator');

        if (user) {
            return;
        }
        const isSigningIn = Cache.getItem('signingIn');

        if (isSigningIn) {
            setSigningIn(true);
        }

        Auth.currentAuthenticatedUser()
            .then((currentUser) => {
                logger.debug('Authenticated user', currentUser);
                setUser({
                    email: currentUser.attributes.email,
                });
                Cache.removeItem('signingIn');
            })
            .catch((_) => {
                // user is not authenticated
            });
    }, [user, setUser]);

    return user ? (
        <>{children}</>
    ) : (
        <Modal
            title="Application Pattern Orchestrator on AWS"
            visible={true}
            subtitle="Please sign in to continue"
        >
            <Box textAlign={'center'}>
                <Button
                    onClick={() => {
                        Cache.setItem('signingIn', true, {
                            expires: new Date().setSeconds(new Date().getSeconds() + 20),
                        });

                        Auth.federatedSignIn();
                    }}
                    type={'button'}
                    variant="primary"
                    size="large"
                    loading={signingIn}
                >
                    Sign in
                </Button>
            </Box>
        </Modal>
    );
};
