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
import { createContext, FunctionComponent, useContext, useState } from 'react';
import { User } from '../../types';

export interface BlueprintContext {
    user?: User;
    email: string;
    setUser: (user: User) => void;
}

const AppContext = createContext<BlueprintContext>({
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setUser: () => {},
    email: 'guest',
});

export const AppContextProvider: FunctionComponent = ({ children }) => {
    const [authenticatedUser, setAuthenticatedUser] = useState<User>();

    return (
        <AppContext.Provider
            value={{
                user: authenticatedUser,
                setUser: setAuthenticatedUser,
                email: authenticatedUser?.email ?? 'guest',
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
