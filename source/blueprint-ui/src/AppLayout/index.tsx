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

import { useMemo } from 'react';
import AppLayoutBase from 'aws-northstar/layouts/AppLayout';
import HeaderBase from 'aws-northstar/components/Header';
import SideNavigationBase, {
    SideNavigationItemType,
} from 'aws-northstar/components/SideNavigation';
import ButtonDropdown from 'aws-northstar/components/ButtonDropdown';
import BreadcrumbGroup from 'aws-northstar/components/BreadcrumbGroup';
import { Auth } from 'aws-amplify';
import { ROUTE_ATTRIBUTES_VIEW, ROUTE_BLUEPRINTS_VIEW } from '../components/routes';
import { useAppContext } from '../components/core/AppContext';

const AppHeader = ({ userEmail }) => {
    const headerDropdown = (
        <ButtonDropdown
            content={userEmail}
            items={[
                {
                    text: 'Sign Out',
                    onClick: async () => {
                        await Auth.signOut();
                        window.location.reload();
                    },
                },
            ]}
            darkTheme={true}
        />
    );

    return (
        <>
            <HeaderBase
                title="Application Pattern Orchestrator on AWS"
                rightContent={headerDropdown}
            />
        </>
    );
};

const AppLayout = ({ children }) => {
    const { user } = useAppContext();

    const Header = useMemo(() => <AppHeader userEmail={user?.email} />, [user?.email]);
    const Breadcrumbs = useMemo(() => <BreadcrumbGroup rootPath="Patterns" />, []);
    const SideNavigation = useMemo(() => {
        return (
            <SideNavigationBase
                header={{
                    text: 'APO on AWS',
                    href: ROUTE_BLUEPRINTS_VIEW,
                }}
                items={[
                    {
                        text: 'Patterns',
                        type: SideNavigationItemType.LINK,
                        href: ROUTE_BLUEPRINTS_VIEW,
                    },
                    {
                        text: 'Attributes',
                        type: SideNavigationItemType.LINK,
                        href: ROUTE_ATTRIBUTES_VIEW,
                    },
                ]}
            ></SideNavigationBase>
        );
    }, []);

    return (
        <AppLayoutBase
            header={Header}
            navigation={SideNavigation}
            breadcrumbs={Breadcrumbs}
        >
            {children}
        </AppLayoutBase>
    );
};

export default AppLayout;
