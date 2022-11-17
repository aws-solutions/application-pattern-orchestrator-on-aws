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

import { fireEvent, render, act } from '@testing-library/react';
import * as ReactQuery from 'react-query';
import { BrowserRouter } from 'react-router-dom';

import PatternDetails from '.';
import { QueryFunction, QueryKey, UseMutationResult, UseQueryResult } from 'react-query';

// Mocks
const mockUseHistoryReplaceFn = jest.fn();
const mockUseHistoryPushFn = jest.fn();
const mockAddNotificationFn = jest.fn();

jest.mock('../../../queries/GetPatternDetailsQuery');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
        push: mockUseHistoryPushFn,
        replace: mockUseHistoryReplaceFn,
    }),
    useParams: () => ({
        blueprintId: fixtureGetCDKPatternDetail.metadata.patternId,
    }),
}));

jest.mock('react-query', () => ({
    ...jest.requireActual('react-query'),
    useQuery: jest.fn(),
    useMutation: jest.fn(),
}));
const mockReactQuery = ReactQuery as jest.Mocked<typeof ReactQuery>;

jest.mock('aws-northstar/layouts/AppLayout', () => ({
    ...jest.requireActual('aws-northstar/layouts/AppLayout'),
    useAppLayoutContext: () => ({
        addNotification: mockAddNotificationFn,
    }),
}));

const fixtureGetCDKPatternDetail = {
    metadata: {
        codeRepository: {
            branchName: 'master',
            type: 'github',
            repoOwner: 'test-enterprise',
            repoName: 'test-cdk-pattern',
        },
        updatedTimestamp: '2022-07-14T02:34:54.880Z',
        patternType: 'CDK',
        patternId: 'test-cdk-pattern',
        lastCommitId: 'aa4633098e95ba8958b7cba0dbcc499001c832f5',
        attributes: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            DataClassification: 'Confidential',
        },
        description: 'test cdk pattern',
        name: 'test-cdk-pattern',
        patternRepoURL: 'git://github.test.org/test-enterprise/test-cdk-pattern.git',
        createdTimestamp: '2022-07-13T14:48:28.239Z',
        infrastructureStackStatus: 'UPDATE_COMPLETE',
    },
    lastCommitPublishData: {
        allPackages: [
            {
                name: '@test-cdk/my-cd-pipeline',
                version: '1.2.0',
            },
        ],
        updatedTimestamp: '2022-07-14T02:34:54.880Z',
        changedPackages: [
            {
                name: '@test-cdk/my-cd-pipeline',
                version: '1.2.0',
            },
        ],
        codeArtifactDetails: {
            codeArtifactRepositoryName: 'awspatterns',
            region: 'ap-southeast-2',
            codeArtifactDomainName: 'awspatterns',
            account: '111111111111',
        },
        patternId: 'test-cdk-pattern',
        artifacts: [
            {
                type: 'CONTROL',
                name: 'cfn_nag.txt',
                location:
                    'test-cdk/aa4633098e95ba8958b7cba0dbcc499001c832f5/controls/cfn_nag.txt',
            },
            {
                type: 'MARKDOWN',
                name: 'README.md',
                location:
                    'test-cdk/aa4633098e95ba8958b7cba0dbcc499001c832f5/markdown/README.md',
            },
        ],
        createdTimestamp: '2022-07-14T02:34:54.880Z',
        commitId: 'aa4633098e95ba8958b7cba0dbcc499001c832f5',
    },
};

const fixtureGetCFNPatternDetail = {
    metadata: {
        codeRepository: {
            branchName: 'master',
            type: 'github',
            repoOwner: 'test-enterprise',
            repoName: 'test-cfn-pattern',
        },
        updatedTimestamp: '2022-07-14T02:28:05.082Z',
        patternType: 'CFN',
        patternId: 'test-cfn-pattern',
        lastCommitId: '35df25218ad849f2f1790b7c5f55f502861bd506',
        attributes: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            DataClassification: 'Confidential',
        },
        description: '',
        name: 'test-cfn-pattern',
        patternRepoURL: 'git://github.test.org/test-enterprise/test-cfn-pattern.git',
        createdTimestamp: '2022-07-13T14:47:55.030Z',
        infrastructureStackStatus: 'UPDATE_COMPLETE',
    },
    lastCommitPublishData: {
        allPackages: [
            {
                name: '@test-cfn/dynamodb-pattern',
                version: '1.1.0',
            },
        ],
        updatedTimestamp: '2022-07-14T02:28:05.082Z',
        changedPackages: [
            {
                name: '@test-cfn/dynamodb-pattern',
                version: '1.1.0',
            },
        ],
        patternId: 'test-cfn',
        artifacts: [
            {
                type: 'CONTROL',
                name: 'cfn_nag.txt',
                location:
                    'test-cfn/35df25218ad849f2f1790b7c5f55f502861bd506/controls/cfn_nag.txt',
            },
            {
                type: 'MARKDOWN',
                name: 'README.md',
                location:
                    'test-cfn/35df25218ad849f2f1790b7c5f55f502861bd506/markdown/README.md',
            },
        ],
        allServiceCatalogProducts: [
            {
                name: 'test-cfn-pattern_@test-cfn/dynamodb-pattern',
                region: 'ap-southeast-2',
                productId: 'prod-eqg6hrfsjrcc4',
                account: '88888866666',
                provisioningArtifactId: 'pa-5ibexbe6bfrws',
            },
        ],
        changedServiceCatalogProducts: [
            {
                name: 'test-cfn-pattern_@test-cfn/dynamodb-pattern',
                region: 'ap-southeast-2',
                productId: 'prod-eqg6hrfsjrcc4',
                account: '88888866666',
                provisioningArtifactId: 'pa-5ibexbe6bfrws',
            },
        ],
        createdTimestamp: '2022-07-14T02:28:05.082Z',
        commitId: '35df25218ad849f2f1790b7c5f55f502861bd506',
    },
};

describe('PatternDetails', () => {
    const { open } = window;

    beforeEach(() => {
        mockAddNotificationFn.mockRestore();
        mockUseHistoryReplaceFn.mockRestore();
        mockReactQuery.useQuery.mockReset();
        mockReactQuery.useMutation.mockReset();
    });

    beforeAll(() => {
        // Replace with the custom value
        window.open = jest.fn();
    });

    afterAll(() => {
        // Restore original
        window.open = open;
    });

    test('render to show CDK pattern details', () => {
        mockReactQuery.useQuery.mockImplementation(
            (queryKey: QueryKey, _queryFn: QueryFunction) => {
                if (queryKey === 'PatternDetails') {
                    return {
                        data: fixtureGetCDKPatternDetail,
                    } as UseQueryResult;
                }

                return { data: {} } as UseQueryResult;
            }
        );

        const { getByText, getAllByText } = render(
            <BrowserRouter>
                <PatternDetails />
            </BrowserRouter>
        );
        expect(mockReactQuery.useQuery).toBeCalledWith(
            'PatternDetails',
            expect.anything(),
            expect.anything()
        );
        expect(getAllByText(fixtureGetCDKPatternDetail.metadata.name)).toHaveLength(2);
        expect(
            getByText(fixtureGetCDKPatternDetail.metadata.description)
        ).toBeInTheDocument();
        expect(
            getByText(fixtureGetCDKPatternDetail.metadata.patternType)
        ).toBeInTheDocument();
        Object.entries(fixtureGetCDKPatternDetail.metadata.attributes).forEach(
            (attribute) => {
                expect(getByText(attribute[0])).toBeInTheDocument();
                expect(getByText(attribute[1])).toBeInTheDocument();
            }
        );
        fixtureGetCDKPatternDetail.lastCommitPublishData.allPackages.forEach((pkg) => {
            expect(getByText(pkg.name)).toBeInTheDocument();
            expect(getByText(pkg.version)).toBeInTheDocument();
        });
        expect(getByText('View In AWS CodeArtifact')).toBeInTheDocument();
        act(() => {
            fireEvent.click(getByText('View In AWS CodeArtifact'));
        });
        expect(window.open).toBeCalledWith(
            `https://${
                fixtureGetCDKPatternDetail.lastCommitPublishData.codeArtifactDetails
                    .region
            }.console.aws.amazon.com/codesuite/codeartifact/d/${
                fixtureGetCDKPatternDetail.lastCommitPublishData.codeArtifactDetails
                    .account
            }/${
                fixtureGetCDKPatternDetail.lastCommitPublishData.codeArtifactDetails
                    .codeArtifactDomainName
            }/r/${
                fixtureGetCDKPatternDetail.lastCommitPublishData.codeArtifactDetails
                    .codeArtifactRepositoryName
            }/p/npm/${
                fixtureGetCDKPatternDetail.lastCommitPublishData.allPackages[0].name.startsWith(
                    '@'
                )
                    ? fixtureGetCDKPatternDetail.lastCommitPublishData.allPackages[0].name.substring(
                          1
                      )
                    : fixtureGetCDKPatternDetail.lastCommitPublishData.allPackages[0].name
            }/v/${
                fixtureGetCDKPatternDetail.lastCommitPublishData.allPackages[0].version
            }?region=${
                fixtureGetCDKPatternDetail.lastCommitPublishData.codeArtifactDetails
                    .region
            }`
        );

        expect(getByText('View Code Repository')).toBeInTheDocument();
        act(() => {
            fireEvent.click(getByText('View Code Repository'));
        });
        expect(window.open).toBeCalledWith(
            fixtureGetCDKPatternDetail.metadata.patternRepoURL.replace(
                'git://',
                'https://'
            )
        );
    });

    test('render to show CFN pattern details', () => {
        mockReactQuery.useQuery.mockImplementation(
            (queryKey: QueryKey, _queryFn: QueryFunction) => {
                if (queryKey === 'PatternDetails') {
                    return {
                        data: fixtureGetCFNPatternDetail,
                    } as UseQueryResult;
                }

                return { data: {} } as UseQueryResult;
            }
        );

        const { getByText } = render(
            <BrowserRouter>
                <PatternDetails />
            </BrowserRouter>
        );

        expect(getByText('View In AWS Service Catalog')).toBeInTheDocument();
        act(() => {
            fireEvent.click(getByText('View In AWS Service Catalog'));
        });
        expect(window.open).toBeCalledWith(
            `https://${fixtureGetCFNPatternDetail.lastCommitPublishData.allServiceCatalogProducts[0].region}.console.aws.amazon.com/servicecatalog/home?region=${fixtureGetCFNPatternDetail.lastCommitPublishData.allServiceCatalogProducts[0].region}#admin-products/${fixtureGetCFNPatternDetail.lastCommitPublishData.allServiceCatalogProducts[0].productId}/version/${fixtureGetCFNPatternDetail.lastCommitPublishData.allServiceCatalogProducts[0].provisioningArtifactId}`
        );

        expect(getByText('Usage')).toBeInTheDocument();
        expect(getByText('Architecture')).toBeInTheDocument();
        expect(
            getByText(fixtureGetCFNPatternDetail.metadata.lastCommitId)
        ).toBeInTheDocument();
    });

    test('render to show error message', () => {
        mockReactQuery.useQuery.mockImplementation(
            (queryKey: QueryKey, _queryFn: QueryFunction) => {
                if (queryKey === 'PatternDetails') {
                    return {
                        error: 'test error message',
                        isError: true,
                    } as UseQueryResult;
                }

                return { data: {} } as UseQueryResult;
            }
        );

        const { getByText } = render(
            <BrowserRouter>
                <PatternDetails />
            </BrowserRouter>
        );

        expect(getByText('test error message')).toBeInTheDocument();
    });

    test('render to show loading in progress', () => {
        mockReactQuery.useQuery.mockImplementation(
            (queryKey: QueryKey, _queryFn: QueryFunction) => {
                if (queryKey === 'PatternDetails') {
                    return {
                        isLoading: true,
                    } as UseQueryResult;
                }

                return { data: {} } as UseQueryResult;
            }
        );

        const { getByRole } = render(
            <BrowserRouter>
                <PatternDetails />
            </BrowserRouter>
        );

        expect(getByRole('progressbar')).toBeInTheDocument();
    });

    test('can update notification subscription', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let useMutationOptions: any;

        const mockMutateFn = jest.fn();

        mockReactQuery.useQuery.mockImplementation(
            (queryKey: QueryKey, _queryFn: QueryFunction) => {
                if (queryKey === 'PatternDetails') {
                    return {
                        data: fixtureGetCDKPatternDetail,
                    } as UseQueryResult;
                }

                return { data: {}, refetch: jest.fn() } as unknown as UseQueryResult;
            }
        );

        mockReactQuery.useMutation.mockImplementation(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (_mutationFn: any, options?: any) => {
                useMutationOptions = options;

                return {
                    isLoading: false,
                    mutate: mockMutateFn,
                } as unknown as UseMutationResult;
            }
        );

        mockMutateFn.mockImplementationOnce(() => {
            useMutationOptions.onSuccess();
        });

        const { getByText } = render(
            <BrowserRouter>
                <PatternDetails />
            </BrowserRouter>
        );

        act(() => {
            fireEvent.click(getByText('Receive Notifications'));
        });

        expect(mockAddNotificationFn).toHaveBeenCalled();

        mockMutateFn.mockImplementationOnce(() => {
            useMutationOptions.onError();
        });

        act(() => {
            fireEvent.click(getByText('Receive Notifications'));
        });
        expect(mockAddNotificationFn).toHaveBeenCalled();
    });
});
