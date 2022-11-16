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
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { fireEvent, render, act, within } from '@testing-library/react';
import * as ReactQuery from 'react-query';
import { BrowserRouter } from 'react-router-dom';

import PatternsList from '.';
import { UseQueryResult } from 'react-query';
import { formatDate } from '../../../../utils/helpers';
import { ROUTE_BLUEPRINT_CREATE } from '../../../routes';
import { GetPatternsApiResponse } from '../../../types';

// Mocks
const mockUseHistoryReplaceFn = jest.fn();
const mockUseHistoryPushFn = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockUseHistoryPushFn,
        replace: mockUseHistoryReplaceFn,
    }),
}));

jest.mock('react-query', () => ({
    ...jest.requireActual('react-query'),
    useQuery: jest.fn(),
}));

const mockReactQuery = ReactQuery as jest.Mocked<typeof ReactQuery>;

const fixtureListPatterns: GetPatternsApiResponse = {
    results: [
        {
            patternMetaData: {
                codeRepository: {
                    branchName: 'master',
                    type: 'github',
                    repoOwner: 'test-enterprise',
                    repoName: 'ver-test-3-cdk',
                },
                updatedTimestamp: '2022-07-14T02:34:54.880Z',
                patternType: 'CDK',
                patternId: 'ver-test-3-cdk',
                lastCommitId: 'aa4633098e95ba8958b7cba0dbcc499001c832f5',
                attributes: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    DataClassification: 'Group',
                },
                description: 'test cdk description 3',
                name: 'ver-test-3-cdk',
                patternRepoURL:
                    'git://github.test.org/test-enterprise/ver-test-3-cdk.git',
                createdTimestamp: '2022-07-13T14:48:28.239Z',
                infrastructureStackStatus: 'UPDATE_COMPLETE',
            },
            lastCommitPublishData: {
                allPackages: [
                    {
                        name: '@demo-cdk/compliant-dynamodbtable',
                        version: '1.0.1',
                    },
                    {
                        name: '@demo-cdk/compliant-s3-bucket',
                        version: '1.0.1',
                    },
                    {
                        name: '@demo-cdk/compliant-f',
                        version: '1.0.1',
                    },
                ],
                updatedTimestamp: '2022-10-26T04:34:36.548Z',
                changedPackages: [
                    {
                        name: '@demo-cdk/compliant-dynamodbtable',
                        version: '1.0.1',
                    },
                    {
                        name: '@demo-cdk/compliant-s3-bucket',
                        version: '1.0.1',
                    },
                ],
                codeArtifactDetails: {
                    codeArtifactRepositoryName: 'awspatterns',
                    region: 'ap-southeast-2',
                    codeArtifactDomainName: 'awspatterns',
                    account: 'zzzzxxxxxxxx',
                },
                artifacts: [
                    {
                        type: 'CONTROL',
                        name: 'cfn_nag.txt',
                        location:
                            'ver-test-3-cdk/edc31bd3cc7b085d67cd2ea9f0126d58db8d62ae/controls/cfn_nag.txt',
                    },
                    {
                        type: 'MARKDOWN',
                        name: 'README.md',
                        location:
                            'ver-test-3-cdk/edc31bd3cc7b085d67cd2ea9f0126d58db8d62ae/markdown/README.md',
                    },
                ],
                commitMessage:
                    'Merge pull request #1 from apjsb-enterprise/feature  new templates added',
                createdTimestamp: '2022-10-26T04:34:36.548Z',
                commitId: 'edc31bd3cc7b085d67cd2ea9f0126d58db8d62ae',
                patternId: 'ver-test-3-cdk',
            },
        },
        {
            patternMetaData: {
                codeRepository: {
                    branchName: 'master',
                    type: 'github',
                    repoOwner: 'test-enterprise',
                    repoName: 'ver-test-3-cfn',
                },
                updatedTimestamp: '2022-07-14T02:28:05.082Z',
                patternType: 'CFN',
                patternId: 'ver-test-3-cfn',
                lastCommitId: '35df25218ad849f2f1790b7c5f55f502861bd506',
                attributes: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    DataClassification: 'Group',
                },
                description: 'test cfn description 3',
                name: 'ver-test-3-cfn',
                patternRepoURL:
                    'git://github.test.org/test-enterprise/ver-test-3-cfn.git',
                createdTimestamp: '2022-07-13T14:47:55.030Z',
                infrastructureStackStatus: 'UPDATE_COMPLETE',
            },
            lastCommitPublishData: {
                allPackages: [
                    {
                        name: '@my-cfn/dynamodb2',
                        version: '1.0.2',
                    },
                    {
                        name: '@my-cfn/dynamodb1',
                        version: '1.0.2',
                    },
                    {
                        name: '@my-cfn/dynamodb3',
                        version: '1.0.2',
                    },
                ],
                updatedTimestamp: '2022-10-25T02:53:14.535Z',
                changedPackages: [
                    {
                        name: '@my-cfn/dynamodb1',
                        version: '1.0.2',
                    },
                ],
                artifacts: [
                    {
                        type: 'CONTROL',
                        name: 'cfn_nag.txt',
                        location:
                            'ver-test-3-cfn/29c26261aa732dd9851258c89a6c375af7cf3d0d/controls/cfn_nag.txt',
                    },
                    {
                        type: 'IMAGE',
                        name: 'architecture.png',
                        location:
                            'ver-test-3-cfn/29c26261aa732dd9851258c89a6c375af7cf3d0d/images/architecture.png',
                    },
                    {
                        type: 'MARKDOWN',
                        name: 'README.md',
                        location:
                            'ver-test-3-cfn/29c26261aa732dd9851258c89a6c375af7cf3d0d/markdown/README.md',
                    },
                    {
                        type: 'MARKDOWN',
                        name: 'USAGE.md',
                        location:
                            'ver-test-3-cfn/29c26261aa732dd9851258c89a6c375af7cf3d0d/markdown/USAGE.md',
                    },
                ],
                changedServiceCatalogProducts: [
                    {
                        name: 'ver-test-3-cfn_@my-cfn/dynamodb2',
                        region: 'ap-southeast-2',
                        productId: 'prod-4jl3muovorp24',
                        account: 'xxxxxxxxxxxx',
                        provisioningArtifactId: 'pa-zapohcgjsqogy',
                    },
                ],
                allServiceCatalogProducts: [
                    {
                        name: 'ver-test-3-cfn_@my-cfn/dynamodb2',
                        region: 'ap-southeast-2',
                        productId: 'prod-4jl3muovorp24',
                        account: 'xxxxxxxxxxxx',
                        provisioningArtifactId: 'pa-zapohcgjsqogy',
                    },
                    {
                        name: 'ver-test-3-cfn_@my-cfn/dynamodb1',
                        region: 'ap-southeast-2',
                        productId: 'prod-4jl3muovorp24',
                        account: 'xxxxxxxxxxxx',
                        provisioningArtifactId: 'pa-zapohcgjsqogy',
                    },
                    {
                        name: 'ver-test-3-cfn_@my-cfn/dynamodb3',
                        region: 'ap-southeast-2',
                        productId: 'prod-4jl3muovorp24',
                        account: 'xxxxxxxxxxxx',
                        provisioningArtifactId: 'pa-zapohcgjsqogy',
                    },
                ],
                commitMessage:
                    'Merge pull request #1 from apjsb-enterprise/feature  new templates added',
                createdTimestamp: '2022-10-25T02:53:14.535Z',
                commitId: '29c26261aa732dd9851258c89a6c375af7cf3d0d',
                patternId: 'ver-test-3-cfn',
            },
        },
        {
            patternMetaData: {
                codeRepository: {
                    branchName: 'master',
                    type: 'github',
                    repoOwner: 'test-enterprise',
                    repoName: 'ver-test-4-cdk',
                },
                updatedTimestamp: '2022-07-15T04:27:07.342Z',
                patternType: 'CDK',
                patternId: 'ver-test-4-cdk',
                description: 'test cdk description 4',
                patternRepoURL:
                    'git://github.test.org/test-enterprise/ver-test-4-cdk.git',
                createdTimestamp: '2022-07-15T04:27:07.342Z',
                name: 'ver-test-4-cdk',
                infrastructureStackStatus: 'CREATE_COMPLETE',
            },
        },
    ],
};

describe('PatternsList', () => {
    const { open } = window;
    beforeAll(() => {
        // Replace with the custom value
        window.open = jest.fn();
    });

    afterAll(() => {
        // Restore original
        window.open = open;
    });
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseHistoryPushFn.mockRestore();
        mockUseHistoryReplaceFn.mockRestore();
    });

    test('render to show patterns list', () => {
        mockReactQuery.useQuery.mockReturnValueOnce({
            data: fixtureListPatterns,
        } as UseQueryResult);

        const { getByText } = render(
            <BrowserRouter>
                <PatternsList />
            </BrowserRouter>
        );
        expect(mockReactQuery.useQuery).toBeCalledWith(
            'listPatterns',
            expect.anything(),
            expect.anything()
        );
        fixtureListPatterns.results.forEach((pattern) => {
            expect(getByText(pattern.patternMetaData.name)).toBeInTheDocument();
            expect(getByText(pattern.patternMetaData.description)).toBeInTheDocument();
            expect(
                getByText(formatDate(new Date(pattern.patternMetaData.createdTimestamp)))
            ).toBeInTheDocument();
        });

        expect(getByText('Not published yet')).toBeInTheDocument();

        // Test to create a new pattern
        fireEvent.click(getByText('Create new Pattern'));
        expect(mockUseHistoryPushFn).toBeCalledWith(ROUTE_BLUEPRINT_CREATE);
    });

    test('CFN pattern window.open redirects to AWS Service Catalog', async () => {
        mockReactQuery.useQuery.mockReturnValueOnce({
            data: fixtureListPatterns,
        } as UseQueryResult);

        const { getByText, findByRole } = render(
            <BrowserRouter>
                <PatternsList />
            </BrowserRouter>
        );
        const testCfnPatternFixture = fixtureListPatterns.results.find(
            (pattern) =>
                pattern.patternMetaData.patternType === 'CFN' &&
                pattern.lastCommitPublishData
        );

        expect(getByText('Not published yet')).toBeInTheDocument();
        expect(getByText('View CFN in AWS Service Catalog')).toBeInTheDocument();
        let menuPackages;
        await act(async () => {
            fireEvent.click(getByText('View CFN in AWS Service Catalog'));
            menuPackages = within(await findByRole('menu'));
        });

        act(() => {
            fireEvent.click(
                menuPackages.getByText(
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    testCfnPatternFixture!.lastCommitPublishData!.allPackages[0]!.name
                )
            );
        });

        expect(window.open).toBeCalledWith(
            `https://${testCfnPatternFixture?.lastCommitPublishData?.allServiceCatalogProducts?.[0].region}.console.aws.amazon.com/servicecatalog/home?region=${testCfnPatternFixture?.lastCommitPublishData?.allServiceCatalogProducts?.[0].region}#admin-products/${testCfnPatternFixture?.lastCommitPublishData?.allServiceCatalogProducts?.[0].productId}/version/${testCfnPatternFixture?.lastCommitPublishData?.allServiceCatalogProducts?.[0].provisioningArtifactId}`
        );
    });

    test('CDK pattern window.open redirects to AWS CodeArtifact', async () => {
        mockReactQuery.useQuery.mockReturnValueOnce({
            data: fixtureListPatterns,
        } as UseQueryResult);

        const { getByText } = render(
            <BrowserRouter>
                <PatternsList />
            </BrowserRouter>
        );

        expect(getByText('View package in AWS CodeArtifact')).toBeInTheDocument();
    });

    test('render to show errors', () => {
        mockReactQuery.useQuery.mockReturnValueOnce({
            data: null,
            isError: true,
            error: 'test error message',
        } as UseQueryResult);

        const { getByText } = render(
            <BrowserRouter>
                <PatternsList />
            </BrowserRouter>
        );
        expect(mockReactQuery.useQuery).toBeCalledWith(
            'listPatterns',
            expect.anything(),
            expect.anything()
        );

        expect(getByText('test error message')).toBeInTheDocument();
    });
});
