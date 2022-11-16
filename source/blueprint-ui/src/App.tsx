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
import React from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import { ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css'; // default theme
import { NorthStarThemeProvider } from 'aws-northstar';

import AppLayout from './AppLayout';
import {
    ROUTE_ATTRIBUTES_VIEW,
    ROUTE_ATTRIBUTE_CREATE,
    ROUTE_ATTRIBUTE_DETAILS,
    ROUTE_ATTRIBUTE_UPDATE,
    ROUTE_BLUEPRINTS_VIEW,
    ROUTE_BLUEPRINT_CREATE,
    ROUTE_BLUEPRINT_DETAIL,
    ROUTE_BLUEPRINT_UPDATE,
} from './components/routes';
import { QueryClient, QueryClientProvider } from 'react-query';
import AttributesContainer from './components/pages/Attributes/List';
import AttributeDetail from './components/pages/Attributes/Detail';
import AttributeCreate from './components/pages/Attributes/Create';
import AttributeUpdate from './components/pages/Attributes/Update';
import PatternsList from './components/pages/Patterns/List';
import PatternCreate from './components/pages/Patterns/Create';
import PatternDetails from './components/pages/Patterns/Detail';
import { Authenticate } from './components/core/Authenticate';
import { AppContextProvider } from './components/core/AppContext';
import PatternUpdate from './components/pages/Patterns/Update';

const queryClient = new QueryClient();

// eslint-disable-next-line @typescript-eslint/naming-convention
function App() {
    return (
        <ThemeProvider>
            <Router>
                <NorthStarThemeProvider>
                    <AppContextProvider>
                        <Authenticate>
                            <QueryClientProvider client={queryClient}>
                                <AppLayout>
                                    <Switch>
                                        <Route exact path="/">
                                            <Redirect to={ROUTE_BLUEPRINTS_VIEW} />
                                        </Route>
                                        <Route
                                            exact
                                            path={ROUTE_BLUEPRINTS_VIEW}
                                            component={PatternsList}
                                        ></Route>
                                        <Route
                                            exact
                                            path={ROUTE_BLUEPRINT_CREATE}
                                            component={PatternCreate}
                                        ></Route>
                                        <Route
                                            exact
                                            path={ROUTE_BLUEPRINT_DETAIL}
                                            component={PatternDetails}
                                        ></Route>
                                        <Route
                                            exact
                                            path={ROUTE_BLUEPRINT_UPDATE}
                                            component={PatternUpdate}
                                        ></Route>
                                        <Route
                                            exact
                                            path={ROUTE_ATTRIBUTES_VIEW}
                                            component={AttributesContainer}
                                        ></Route>
                                        <Route
                                            exact
                                            path={ROUTE_ATTRIBUTE_CREATE}
                                            component={AttributeCreate}
                                        ></Route>
                                        <Route
                                            exact
                                            path={ROUTE_ATTRIBUTE_DETAILS}
                                            component={AttributeDetail}
                                        ></Route>
                                        <Route
                                            exact
                                            path={ROUTE_ATTRIBUTE_UPDATE}
                                            component={AttributeUpdate}
                                        ></Route>
                                    </Switch>
                                </AppLayout>
                            </QueryClientProvider>
                        </Authenticate>
                    </AppContextProvider>
                </NorthStarThemeProvider>
            </Router>
        </ThemeProvider>
    );
}

export default App;
