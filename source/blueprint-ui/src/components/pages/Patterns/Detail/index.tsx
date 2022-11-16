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

import { useMutation, useQuery } from 'react-query';
import { generatePath, useHistory, useParams } from 'react-router-dom';
import { FunctionComponent, useMemo } from 'react';
import { format as formatDate } from 'date-fns';
import {
    Button,
    Column,
    ColumnLayout,
    Container,
    HeadingStripe,
    Inline,
    KeyValuePair,
    Stack,
    Toggle,
} from 'aws-northstar';
import ExpandableSection from 'aws-northstar/components/ExpandableSection';
import Box from 'aws-northstar/layouts/Box';
import Table from 'aws-northstar/components/Table';
import QueryContainerTemplate from '../../../core/QueryContainerTemplate';
import BlueprintInfrastructureStatus from '../../InfrastructureStatus';
import BlueprintVersionContainer from '../../../containers/BlueprintVersion';
import GetPatternDetails from '../../../queries/GetPatternDetailsQuery';
import { getSubscriptionQuery } from '../../../queries/GetSubscriptionQuery';
import { useAppContext } from '../../../core/AppContext';
import { setupNotification } from '../../../queries/Mutation';
import { useAppLayoutContext } from 'aws-northstar/layouts/AppLayout';
import { v4 as uuid } from 'uuid';
import { ROUTE_BLUEPRINT_UPDATE } from '../../../routes';
import { NpmPackageDetails, PatternServiceCatalogProduct } from '../../../types';

const PatternDetails: FunctionComponent = () => {
    const context = useAppContext();
    const appLayout = useAppLayoutContext();
    const history = useHistory();
    const { blueprintId } = useParams<{ blueprintId: string }>();
    const {
        isLoading,
        isError,
        data: patternData,
        error,
    } = useQuery('PatternDetails', () => GetPatternDetails(blueprintId), {
        retry: 3,
    });

    const email = useMemo(() => context.email, [context]);

    const {
        data: subscription,
        isLoading: loadingSubs,
        refetch,
    } = useQuery(
        ['getsubs', blueprintId, email],
        () => getSubscriptionQuery(blueprintId, email),
        {
            retry: 3,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
        }
    );

    const subscribe = useMutation(setupNotification, {
        onSuccess: () => {
            appLayout.addNotification({
                id: uuid(),
                type: 'success',
                header: 'Successfully updated your notification preference.',
                dismissible: true,
            });
            refetch();
        },
        onError: () => {
            appLayout.addNotification({
                id: uuid(),
                type: 'error',
                header: 'Failed to update your notification preference.',
                dismissible: true,
            });
        },
    });

    const subscribed = useMemo(() => {
        return subscription !== undefined;
    }, [subscription]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfnPatternKeyValueColumnDefs: any[] = [
        {
            id: 'name',
            width: 400,
            Header: 'Name',
            accessor: 'name',
        },
        {
            id: 'version',
            width: 400,
            Header: 'Version',
            accessor: 'version',
        },
        {
            id: 'viewPatternStoreButton',
            width: 300,
            Header: '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Cell: ({ row }: any) => {
                return (
                    <Inline>
                        <Button
                            size="small"
                            onClick={() =>
                                window.open(
                                    `https://${row.original.region}.console.aws.amazon.com/servicecatalog/home?region=${row.original.region}#admin-products/${row.original.productId}/version/${row.original.provisioningArtifactId}`
                                )
                            }
                        >
                            View In AWS Service Catalog
                        </Button>
                    </Inline>
                );
            },
        },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cdkPatternKeyValueColumnDefs: any[] = [
        {
            id: 'name',
            width: 400,
            Header: 'Name',
            accessor: 'name',
        },
        {
            id: 'version',
            width: 400,
            Header: 'Version',
            accessor: 'version',
        },
        {
            id: 'viewPatternStoreButton',
            width: 300,
            Header: '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Cell: ({ row }: any) => {
                return (
                    <Inline>
                        <Button
                            size="small"
                            onClick={() =>
                                window.open(
                                    `https://${
                                        row.original.region
                                    }.console.aws.amazon.com/codesuite/codeartifact/d/${
                                        row.original.account
                                    }/${row.original.codeArtifactDomainName}/r/${
                                        row.original.codeArtifactRepositoryName
                                    }/p/npm/${
                                        row.original.name.charAt(0) === '@'
                                            ? row.original.name.substring(1)
                                            : row.original.name
                                    }/v/${row.original.version}?region=${
                                        row.original.region
                                    }`
                                )
                            }
                        >
                            View In AWS CodeArtifact
                        </Button>
                    </Inline>
                );
            },
        },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attributeskeyValueColumnDefs: any[] = [
        {
            id: 'key',
            width: 400,
            Header: 'Key',
            accessor: 'key',
        },
        {
            id: 'value',
            width: 400,
            Header: 'Value',
            accessor: 'value',
        },
    ];

    const blueprintActions = useMemo(() => {
        return (
            <QueryContainerTemplate
                data={patternData}
                loading={isLoading || loadingSubs}
                error={isError && error ? (error as string) : undefined}
            >
                {() => (
                    <Inline>
                        {patternData?.metadata && (
                            <Button
                                variant="primary"
                                onClick={() =>
                                    window.open(
                                        patternData.metadata.patternRepoURL?.replace(
                                            'git://',
                                            'https://'
                                        )
                                    )
                                }
                            >
                                View Code Repository
                            </Button>
                        )}
                    </Inline>
                )}
            </QueryContainerTemplate>
        );
    }, [error, isError, isLoading, loadingSubs, patternData, subscription]);

    const ActionButtons = useMemo(() => {
        const path = generatePath(ROUTE_BLUEPRINT_UPDATE, {
            blueprintId,
        });

        return (
            <Inline>
                <Button
                    onClick={() => {
                        history.push(path);
                    }}
                >
                    Edit
                </Button>
            </Inline>
        );
    }, [blueprintId, history]);

    return (
        <QueryContainerTemplate
            data={patternData}
            loading={isLoading || loadingSubs}
            error={isError && error ? (error as string) : undefined}
        >
            {() => (
                <Stack>
                    {patternData?.metadata && (
                        <>
                            <HeadingStripe
                                title={patternData.metadata.name}
                                actionButtons={ActionButtons}
                            />
                            <Container
                                title="Pattern Details"
                                actionGroup={blueprintActions}
                            >
                                <ColumnLayout renderDivider={true}>
                                    <Column>
                                        <Stack>
                                            <KeyValuePair
                                                label="Name"
                                                value={patternData.metadata.name}
                                            />
                                            <KeyValuePair
                                                label="Description"
                                                value={patternData.metadata.description}
                                            />
                                            <KeyValuePair
                                                label="Last CommitId"
                                                value={
                                                    patternData.metadata.lastCommitId
                                                        ? patternData.metadata
                                                              .lastCommitId
                                                        : 'No Version Published Yet'
                                                }
                                            />
                                            <Toggle
                                                //checked={subscription === undefined}
                                                checked={subscribed}
                                                label={'Receive Notifications'}
                                                onChange={(enabled) => {
                                                    subscribe.mutate({
                                                        patternId: blueprintId,
                                                        email,
                                                        subscribe: enabled,
                                                    });
                                                }}
                                            />
                                        </Stack>
                                    </Column>
                                    <Column>
                                        <Stack>
                                            <KeyValuePair
                                                label="Pattern Type"
                                                value={patternData.metadata.patternType}
                                            />
                                            <KeyValuePair
                                                label="Pattern Pipeline Status"
                                                value={
                                                    <BlueprintInfrastructureStatus
                                                        status={
                                                            patternData.metadata
                                                                .infrastructureStackStatus
                                                        }
                                                    />
                                                }
                                            />
                                            <KeyValuePair
                                                label="Created At"
                                                value={
                                                    patternData.metadata
                                                        .createdTimestamp &&
                                                    formatDate(
                                                        new Date(
                                                            patternData.metadata.createdTimestamp
                                                        ),
                                                        'Pp'
                                                    )
                                                }
                                            />
                                        </Stack>
                                    </Column>
                                </ColumnLayout>
                            </Container>
                        </>
                    )}

                    {patternData?.metadata &&
                        patternData.metadata.lastCommitId &&
                        patternData.lastCommitPublishData && (
                            <ExpandableSection
                                variant="container"
                                header={`Packages (${
                                    patternData.lastCommitPublishData.allPackages
                                        .length || 0
                                })`}
                                expanded={false}
                            >
                                {patternData.metadata.patternType === 'CFN' && (
                                    <Box width="100%">
                                        <Table
                                            columnDefinitions={
                                                cfnPatternKeyValueColumnDefs
                                            }
                                            items={patternData.lastCommitPublishData.allPackages.map(
                                                (npmPackage: NpmPackageDetails) => {
                                                    const scProduct =
                                                        patternData.lastCommitPublishData?.allServiceCatalogProducts?.find(
                                                            (
                                                                scProduct: PatternServiceCatalogProduct
                                                            ) =>
                                                                scProduct.name.substring(
                                                                    patternData.metadata
                                                                        .patternId
                                                                        .length + 1
                                                                ) === npmPackage.name
                                                        );
                                                    return {
                                                        ...npmPackage,
                                                        region: scProduct?.region,
                                                        productId: scProduct?.productId,
                                                        account: scProduct?.account,
                                                        provisioningArtifactId:
                                                            scProduct?.provisioningArtifactId,
                                                    };
                                                }
                                            )}
                                            wrapText={false}
                                            disableGroupBy={true}
                                            disableSettings={true}
                                            disablePagination={true}
                                            disableFilters={true}
                                            disableRowSelect={true}
                                            sortBy={[
                                                {
                                                    id: 'name',
                                                    desc: false,
                                                },
                                            ]}
                                        />
                                    </Box>
                                )}
                                {patternData.metadata.patternType === 'CDK' && (
                                    <Box width="100%">
                                        <Table
                                            columnDefinitions={
                                                cdkPatternKeyValueColumnDefs
                                            }
                                            items={patternData.lastCommitPublishData.allPackages.map(
                                                (item) => ({
                                                    ...item,
                                                    ...patternData.lastCommitPublishData
                                                        ?.codeArtifactDetails,
                                                })
                                            )}
                                            wrapText={false}
                                            disableGroupBy={true}
                                            disableSettings={true}
                                            disablePagination={true}
                                            disableFilters={true}
                                            disableRowSelect={true}
                                            sortBy={[
                                                {
                                                    id: 'name',
                                                    desc: false,
                                                },
                                            ]}
                                        />
                                    </Box>
                                )}
                            </ExpandableSection>
                        )}
                    <ExpandableSection
                        variant="container"
                        header={`Attributes (${
                            patternData?.metadata.attributes
                                ? Object.entries(patternData.metadata.attributes).length
                                : 0
                        })`}
                        expanded={false}
                    >
                        {}
                        <Box width="100%">
                            {patternData?.metadata.attributes ? (
                                <Table
                                    columnDefinitions={attributeskeyValueColumnDefs}
                                    items={Object.entries(
                                        patternData.metadata.attributes
                                    ).map((item) => ({
                                        key: item[0],
                                        value: item[1],
                                    }))}
                                    wrapText={false}
                                    disableGroupBy={true}
                                    disableSettings={true}
                                    disablePagination={true}
                                    disableFilters={true}
                                    disableRowSelect={true}
                                    sortBy={[
                                        {
                                            id: 'name',
                                            desc: false,
                                        },
                                    ]}
                                />
                            ) : (
                                'No records found'
                            )}
                        </Box>
                    </ExpandableSection>
                    {patternData?.lastCommitPublishData && (
                        <BlueprintVersionContainer
                            blueprintVersion={patternData.lastCommitPublishData}
                        />
                    )}
                </Stack>
            )}
        </QueryContainerTemplate>
    );
};

export default PatternDetails;
