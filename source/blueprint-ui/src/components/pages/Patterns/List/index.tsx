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

import { FunctionComponent, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import Table from 'aws-northstar/components/Table';
import { generatePath, useHistory } from 'react-router-dom';
import { Button, ButtonDropdown, Inline, Link, Text } from 'aws-northstar';
import {
    ROUTE_BLUEPRINT_CREATE,
    ROUTE_BLUEPRINT_DETAIL,
    ROUTE_BLUEPRINT_UPDATE,
} from '../../../routes';
import GetAllPatternsQuery from '../../../queries/GetAllPatternsQuery';
import QueryContainerTemplate from '../../../core/QueryContainerTemplate';
import BlueprintInfrastructureStatus from '../../InfrastructureStatus/index';
import { formatDate } from '../../../../utils/helpers';
import { PatternWithPublishData } from '../../../types';

export const getColumnDefinitions = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields: any[] = [
        {
            id: 'name',
            width: 500,
            Header: 'Name',
            accessor: 'patternMetaData.name',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Cell: ({ row }: any) => {
                return (
                    <Link
                        href={generatePath(ROUTE_BLUEPRINT_DETAIL, {
                            blueprintId: row.original.patternMetaData.patternId,
                        })}
                    >
                        {row.original.patternMetaData.name}
                    </Link>
                );
            },
        },
        {
            id: 'patternType',
            width: 200,
            Header: 'Type',
            accessor: 'patternMetaData.patternType',
        },
        {
            id: 'description',
            width: 200,
            Header: 'Description',
            accessor: 'patternMetaData.description',
        },
        {
            id: 'infrastructureStackStatus',
            width: 200,
            Header: `Pattern's Pipeline Status`,
            accessor: 'patternMetaData.infrastructureStackStatus',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Cell: ({ row }: any) => {
                return (
                    <BlueprintInfrastructureStatus
                        status={row.original.patternMetaData.infrastructureStackStatus}
                    />
                );
            },
        },
        {
            id: 'createTime',
            width: 200,
            Header: 'Create Time',
            accessor: 'patternMetaData.createdTimestamp',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Cell: ({ row }: any) =>
                formatDate(new Date(row.original.patternMetaData.createdTimestamp)),
        },
        {
            id: 'viewPatternStoreButton',
            width: 350,
            Header: '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Cell: ({ row }: any) => {
                return (
                    <Inline>
                        {row.original.patternMetaData &&
                            row.original.patternMetaData.patternType === 'CFN' &&
                            row.original.lastCommitPublishData &&
                            row.original.lastCommitPublishData
                                .allServiceCatalogProducts && (
                                <ButtonDropdown
                                    content="View CFN in AWS Service Catalog"
                                    items={row.original.lastCommitPublishData.allPackages
                                        .map((npmPackage) => {
                                            const scProduct =
                                                row.original.lastCommitPublishData.allServiceCatalogProducts.find(
                                                    (item) =>
                                                        item.name ===
                                                        row.original.lastCommitPublishData
                                                            .patternId +
                                                            '_' +
                                                            npmPackage.name
                                                );
                                            return {
                                                text: npmPackage.name,
                                                onClick: () => {
                                                    window.open(
                                                        `https://${scProduct.region}.console.aws.amazon.com/servicecatalog/home?region=${scProduct.region}#admin-products/${scProduct.productId}/version/${scProduct.provisioningArtifactId}`
                                                    );
                                                },
                                            };
                                        })
                                        .sort((attr1, attr2) => {
                                            if (attr1.text > attr2.text) {
                                                return 1;
                                            }
                                            if (attr1.text < attr2.text) {
                                                return -1;
                                            }
                                        })}
                                />
                            )}
                        {row.original.patternMetaData &&
                            row.original.patternMetaData.patternType === 'CDK' &&
                            row.original.lastCommitPublishData &&
                            row.original.lastCommitPublishData.codeArtifactDetails && (
                                <ButtonDropdown
                                    content="View package in AWS CodeArtifact"
                                    items={row.original.lastCommitPublishData.allPackages
                                        .map((npmPackage) => {
                                            return {
                                                text: npmPackage.name,
                                                onClick: () =>
                                                    window.open(
                                                        `https://${
                                                            row.original
                                                                .lastCommitPublishData
                                                                .codeArtifactDetails
                                                                .region
                                                        }.console.aws.amazon.com/codesuite/codeartifact/d/${
                                                            row.original
                                                                .lastCommitPublishData
                                                                .codeArtifactDetails
                                                                .account
                                                        }/${
                                                            row.original
                                                                .lastCommitPublishData
                                                                .codeArtifactDetails
                                                                .codeArtifactDomainName
                                                        }/r/${
                                                            row.original
                                                                .lastCommitPublishData
                                                                .codeArtifactDetails
                                                                .codeArtifactRepositoryName
                                                        }/p/npm/${
                                                            npmPackage.name.charAt(0) ===
                                                            '@'
                                                                ? npmPackage.name.substring(
                                                                      1
                                                                  )
                                                                : npmPackage.name
                                                        }/v/${
                                                            npmPackage.version
                                                        }?region=${
                                                            row.original
                                                                .lastCommitPublishData
                                                                .codeArtifactDetails
                                                                .region
                                                        }`
                                                    ),
                                            };
                                        })
                                        .sort((attr1, attr2) => {
                                            if (attr1.text > attr2.text) {
                                                return 1;
                                            }
                                            if (attr1.text < attr2.text) {
                                                return -1;
                                            }
                                        })}
                                />
                            )}
                        {row.original.patternMetaData &&
                            !row.original.lastCommitPublishData && (
                                <Text>Not published yet</Text>
                            )}
                    </Inline>
                );
            },
        },
    ];

    return fields;
};

const PatternsList: FunctionComponent = () => {
    const history = useHistory();
    const [selectedPatterns, setSelectedPatterns] = useState<PatternWithPublishData[]>(
        []
    );
    const { isLoading, isError, data, error } = useQuery(
        'listPatterns',
        GetAllPatternsQuery,
        {
            retry: 3,
        }
    );
    const columnDefinitions = useMemo(() => getColumnDefinitions(), []);

    const patternsTableActions = useMemo(() => {
        const pathUpdate = selectedPatterns[0]?.patternMetaData.name
            ? generatePath(ROUTE_BLUEPRINT_UPDATE, {
                  blueprintId: selectedPatterns[0].patternMetaData.name,
              })
            : '';

        return (
            <Inline>
                <Button
                    disabled={selectedPatterns.length !== 1}
                    onClick={() => {
                        history.push(pathUpdate);
                    }}
                >
                    Update
                </Button>
                <Button
                    variant="primary"
                    onClick={() => {
                        history.push(ROUTE_BLUEPRINT_CREATE);
                    }}
                >
                    Create new Pattern
                </Button>
            </Inline>
        );
    }, [history, selectedPatterns]);

    return (
        <QueryContainerTemplate
            data={data}
            loading={isLoading}
            error={isError && error ? (error as string) : undefined}
        >
            {() => (
                <Table
                    tableTitle={`Patterns (${data?.results.length})`}
                    multiSelect={false}
                    actionGroup={patternsTableActions}
                    onSelectionChange={setSelectedPatterns}
                    columnDefinitions={columnDefinitions}
                    disableRowSelect={false}
                    items={data?.results}
                    wrapText={false}
                    sortBy={[{ id: 'createTime', desc: true }]}
                />
            )}
        </QueryContainerTemplate>
    );
};

export default PatternsList;
