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
/* eslint-disable @typescript-eslint/naming-convention */
import { BlueprintType, PatternRepoType } from './blueprint-infrastructure-types';

// Security check codebuild trigger type
type TriggerType = 'PR' | 'Pipeline';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const generateBuildStageBuildspec = (
    blueprintType: BlueprintType,
    triggerType: TriggerType,
    patternRepoType: PatternRepoType,
    proxyUri?: string,
    githubTokenSecretId?: string,
    githubEnterpriseServerUrl?: string,
    repoName?: string,
    githubRepoOwner?: string
) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildSpec: any = {
        version: 0.2,
        env: {
            variables: {
                CONTROLS_FOLDER: '/controls',
                TEMPLATES_FOLDER: '/templates',
                IMAGES_FOLDER: '/images',
                MARKDOWN_FOLDER: '/markdown',
            },
            'exported-variables': [
                'CONTROL_ARTIFACTS_NAMES',
                'IMAGE_ARTIFACTS_NAMES',
                'MARKDOWN_ARTIFACTS_NAMES',
                'TEMPLATES_ARTIFACTS_NAMES',
            ],
        },
        phases: {
            install: {
                'runtime-versions': {
                    ruby: 3.2,
                    nodejs: 18,
                },
                commands: [
                    'apt-get update -y',
                    'apt-get install -y cpio',
                    'gem install cfn-nag',
                    'mkdir -p ${CONTROLS_FOLDER} ${IMAGES_FOLDER} ${MARKDOWN_FOLDER} ${TEMPLATES_FOLDER}',
                ],
            },
            build: {
                commands: [
                    // Copy images in the image artifacts folder
                    'find images -name \\*.png -exec cp {} ${IMAGES_FOLDER} \\;',
                    // Copy markdown documents in the markdown artifacts folder
                    'cp *.md ${MARKDOWN_FOLDER} | true',
                    // Run controls and save the controls output in the control artifacts folder
                    getCfnNagCommand(triggerType),
                    // Store the artifact names in exported environment variables
                    "export CONTROL_ARTIFACTS_NAMES=`ls -m ${CONTROLS_FOLDER} | sed 's/ //g'`",
                    "export TEMPLATES_ARTIFACTS_NAMES=`ls -m ${TEMPLATES_FOLDER} | sed 's/ //g'`",
                    "export IMAGE_ARTIFACTS_NAMES=`ls -m ${IMAGES_FOLDER} | sed 's/ //g'`",
                    "export MARKDOWN_ARTIFACTS_NAMES=`ls -m ${MARKDOWN_FOLDER} | sed 's/ //g'`",
                ],
            },
            post_build: {
                commands: [
                    // Create placeholder files if no images or markdown files found in the repo to avoid codebuild failure
                    'if [ -z "$(ls -A ${IMAGES_FOLDER})" ]; then touch ${IMAGES_FOLDER}/placeholder; fi',
                    'if [ -z "$(ls -A ${MARKDOWN_FOLDER})" ]; then touch ${MARKDOWN_FOLDER}/placeholder; fi',
                ],
            },
        },
        artifacts: {
            'secondary-artifacts': {
                controls: {
                    'base-directory': '${CONTROLS_FOLDER}',
                    files: ['**/*'],
                },
                templates: {
                    'base-directory': '${TEMPLATES_FOLDER}',
                    files: ['**/*'],
                },
                images: {
                    'base-directory': '${IMAGES_FOLDER}',
                    files: ['**/*'],
                },
                markdown: {
                    'base-directory': '${MARKDOWN_FOLDER}',
                    files: ['**/*'],
                },
            },
        },
        cache: {
            paths: ['/root/.npm/**/*'],
        },
    };

    if (triggerType === 'PR') {
        if (patternRepoType === 'GitHub') {
            buildSpec.env['secrets-manager'] = {
                GITHUB_TOKEN: githubTokenSecretId,
            };
            buildSpec.phases.post_build.commands.push(
                `PR_NUMBER=$(echo $CODEBUILD_WEBHOOK_TRIGGER | sed 's:.*/::')`
            );
            const githubBaseUrl = getGithubBaseUrl(githubEnterpriseServerUrl);
            buildSpec.phases.post_build.commands.push(
                `curl -X POST -H "Accept: application/vnd.github+json" -H "Authorization: token $GITHUB_TOKEN" ${githubBaseUrl}/repos/${githubRepoOwner}/${repoName}/issues/$PR_NUMBER/comments -d "$(${getCfnNagCommand(
                    triggerType
                )}| sed 's/-//g' | jq -Rsc '{"body": .}')"`
            );
        } else {
            // For CodeCommit
            // Create approval rule
            buildSpec.phases.post_build.commands.push(
                `aws codecommit create-pull-request-approval-rule --pull-request-id $PR_NUMBER --approval-rule-name "Require one approval atleast" --approval-rule-content "{\\"Version\\": \\"2018-11-08\\",\\"Statements\\": [{\\"Type\\": \\"Approvers\\",\\"NumberOfApprovalsNeeded\\": 1}]}" || true`
            );
            // perform security check
            buildSpec.phases.post_build.commands.push(
                `SCAN_RESULT=$(${getCfnNagCommand(triggerType)}); EXITCODE=$?`
            );
            // Post security scan result in PR comments
            buildSpec.phases.post_build.commands.push(
                `aws codecommit post-comment-for-pull-request --pull-request-id $PR_NUMBER --repository-name ${repoName} --content "$SCAN_RESULT" --before-commit-id $BEFORE_COMMIT_ID --after-commit-id $AFTER_COMMIT_ID`
            );
            buildSpec.phases.post_build.commands.push(
                `${getCfnNagCommand(triggerType)}; EXITCODE=$?`
            );
            buildSpec.phases.post_build.commands.push(
                `if [ $EXITCODE -ne 0 ] 
                then 
                    PR_STATUS='REVOKE'
                else
                    PR_STATUS='APPROVE'
                fi`
            );
            // get revision id
            buildSpec.phases.post_build.commands.push(
                `REVISION_ID=$(aws codecommit get-pull-request --pull-request-id $PR_NUMBER | jq -r '.pullRequest.revisionId')`
            );
            // approve/reject the PR based on the security scan result. For approval there should be no failures or warnings in security scan result
            buildSpec.phases.post_build.commands.push(
                `aws codecommit update-pull-request-approval-state --pull-request-id $PR_NUMBER --revision-id $REVISION_ID --approval-state $PR_STATUS`
            );
        }
    }

    if (blueprintType === 'CFN') {
        // Copy CFN templates to the template artifacts folder
        buildSpec.phases.build.commands.unshift(
            "find ./packages -name '*.template' | cpio -pdm ${TEMPLATES_FOLDER}"
        );
    } else {
        // For CDK based pattern
        // install dependencies
        buildSpec.phases.install.commands.push('npm install --global yarn');
        buildSpec.phases.install.commands.push('yarn');
        // Run cdk synth and store output in template artifacts folder
        buildSpec.phases.build.commands.unshift(
            // Build
            'yarn build',
            // Test
            'yarn test',
            // Generate CFN templates
            'yarn synth',
            // Copy synth generated templates to ${TEMPLATES_FOLDER}
            'cp -R templates/*.template.json ${TEMPLATES_FOLDER}'
        );
    }

    if (proxyUri && proxyUri.length > 0) {
        buildSpec.phases.install.commands.unshift(
            `export http_proxy=${proxyUri}`,
            `export https_proxy=${proxyUri}`,
            `npm config set proxy http://${proxyUri}`,
            `npm config set https-proxy http://${proxyUri}`
        );
    }

    return buildSpec;
};

const removeTrailingSlash = (str: string): string =>
    str.endsWith('/') ? str.slice(0, -1) : str;

// get github base rest endpoint url
const getGithubBaseUrl = (githubEnterpriseServerUrl: string | undefined): string =>
    githubEnterpriseServerUrl
        ? removeTrailingSlash(githubEnterpriseServerUrl) + '/api/v3'
        : 'https://api.github.com';

const getCfnNagCommand = (triggerType: TriggerType): string => {
    let cfnNagCommand = 'cfn_nag_scan --input-path ${TEMPLATES_FOLDER} -o txt';
    if (triggerType === 'PR') {
        // let cfn nag fail fast for PR triggered security check
        cfnNagCommand = cfnNagCommand.replace('cfn_nag_scan', 'cfn_nag_scan -f');
    } else {
        cfnNagCommand = cfnNagCommand + ' | tee ${CONTROLS_FOLDER}/cfn_nag.txt';
    }
    return cfnNagCommand;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const generateReleaseStageBuildspec = (
    blueprintType: BlueprintType,
    proxyUri?: string
) => {
    const buildSpec = {
        version: 0.2,
        env: {
            'git-credential-helper': true,
            'exported-variables': ['CHANGED_PACKAGES', 'ALL_PACKAGES'],
        },
        phases: {
            install: {
                'runtime-versions': {
                    nodejs: 18,
                },
                commands: ['npm install lerna --global'],
            },
            build: {
                commands: [
                    "export CHANGED_PACKAGES=$(lerna changed -l --json | jq -r 'map({name:.name,version:.version,location:.location}) | @base64')",
                    'git checkout $RELEASE_BRANCH_NAME',
                ],
            },
            post_build: {
                commands: [
                    "export ALL_PACKAGES=$(lerna list -l --json | jq -r 'map({name:.name,version:.version,location:.location}) | @base64')",
                ],
            },
        },
        cache: {
            paths: ['/root/.npm/**/*'],
        },
    };

    if (blueprintType === 'CDK') {
        // Login to codeartifact at the start of build phase
        buildSpec.phases.build.commands.unshift(
            'aws codeartifact login --tool npm --domain ${CODEARTIFACT_DOMAIN_NAME} --repository ${CODEARTIFACT_REPOSITORY_NAME}'
        );
        // publish packages
        // lerna by default uses atomic push when pushing to git which is not configurable.
        // If unsuccesful, falls back to non-atomic push which fails the codebuild due to non 0 exit code.
        // CodeCommit doesn't support atomic push. Hence using '||' to allow it to continue even with non-atomic commit.
        buildSpec.phases.build.commands.push('lerna publish -y || true');
    } else {
        // For CFN based pattern only bump version and create tags without publishing
        buildSpec.phases.build.commands.push('lerna version -y || true');
    }

    if (proxyUri && proxyUri.length > 0) {
        buildSpec.phases.install.commands.unshift(
            `export http_proxy=${proxyUri}`,
            `export https_proxy=${proxyUri}`,
            `npm config set proxy http://${proxyUri}`,
            `npm config set https-proxy http://${proxyUri}`
        );
    }

    return buildSpec;
};
