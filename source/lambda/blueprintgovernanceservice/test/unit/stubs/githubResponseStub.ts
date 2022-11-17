/* eslint-disable */
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
export const gitHubResponseStub = {
    status: 201,
    url: 'https://api.github.com/user/repos',
    headers: {
        'access-control-allow-origin': '*',
        'access-control-expose-headers':
            'ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, Deprecation, Sunset',
        'cache-control': 'private, max-age=60, s-maxage=60',
        connection: 'close',
        'content-length': '5217',
        'content-security-policy': "default-src 'none'",
        'content-type': 'application/json; charset=utf-8',
        date: 'Mon, 30 Aug 2021 09:47:26 GMT',
        etag: '"8a65c46f763e226ae31064ce9a3abaeb951b7dc3419d2a800e7c90d123d8bb70"',
        'github-authentication-token-expiration': '2021-09-28 07:31:35 UTC',
        location: 'https://api.github.com/repos/awsapjsb/serverlessapp2',
        'referrer-policy': 'origin-when-cross-origin, strict-origin-when-cross-origin',
        server: 'GitHub.com',
        'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
        vary: 'Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding, Accept, X-Requested-With',
        'x-accepted-oauth-scopes': 'public_repo, repo',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'deny',
        'x-github-media-type': 'github.v3; format=json',
        'x-github-request-id': '1D0B:6F49:FD4326:1182C94:612CA92D',
        'x-oauth-scopes':
            'admin:org, admin:repo_hook, delete_repo, gist, repo, workflow, write:packages',
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4997',
        'x-ratelimit-reset': '1630317652',
        'x-ratelimit-resource': 'core',
        'x-ratelimit-used': '3',
        'x-xss-protection': '0',
    },
    data: {
        id: 401292332,
        node_id: 'MDEwOlJlcG9zaXRvcnk0MDEyOTIzMzI=',
        name: 'serverlessapp2',
        full_name: 'awsapjsb/serverlessapp2',
        private: true,
        owner: {
            login: 'awsapjsb',
            id: 18340110,
            node_id: 'MDQ6VXNlcjE4MzQwMTEw',
            avatar_url: 'https://avatars.githubusercontent.com/u/18340110?v=4',
            gravatar_id: '',
            url: 'https://api.github.com/users/awsapjsb',
            html_url: 'https://github.com/awsapjsb',
            followers_url: 'https://api.github.com/users/awsapjsb/followers',
            following_url: 'https://api.github.com/users/awsapjsb/following{/other_user}',
            gists_url: 'https://api.github.com/users/awsapjsb/gists{/gist_id}',
            starred_url: 'https://api.github.com/users/awsapjsb/starred{/owner}{/repo}',
            subscriptions_url: 'https://api.github.com/users/awsapjsb/subscriptions',
            organizations_url: 'https://api.github.com/users/awsapjsb/orgs',
            repos_url: 'https://api.github.com/users/awsapjsb/repos',
            events_url: 'https://api.github.com/users/awsapjsb/events{/privacy}',
            received_events_url: 'https://api.github.com/users/awsapjsb/received_events',
            type: 'User',
            site_admin: false,
        },
        html_url: 'https://github.com/awsapjsb/serverlessapp2',
        description: null,
        fork: false,
        url: 'https://api.github.com/repos/awsapjsb/serverlessapp2',
        forks_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/forks',
        keys_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/keys{/key_id}',
        collaborators_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/collaborators{/collaborator}',
        teams_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/teams',
        hooks_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/hooks',
        issue_events_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/issues/events{/number}',
        events_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/events',
        assignees_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/assignees{/user}',
        branches_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/branches{/branch}',
        tags_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/tags',
        blobs_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/git/blobs{/sha}',
        git_tags_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/git/tags{/sha}',
        git_refs_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/git/refs{/sha}',
        trees_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/git/trees{/sha}',
        statuses_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/statuses/{sha}',
        languages_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/languages',
        stargazers_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/stargazers',
        contributors_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/contributors',
        subscribers_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/subscribers',
        subscription_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/subscription',
        commits_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/commits{/sha}',
        git_commits_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/git/commits{/sha}',
        comments_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/comments{/number}',
        issue_comment_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/issues/comments{/number}',
        contents_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/contents/{+path}',
        compare_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/compare/{base}...{head}',
        merges_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/merges',
        archive_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/{archive_format}{/ref}',
        downloads_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/downloads',
        issues_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/issues{/number}',
        pulls_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/pulls{/number}',
        milestones_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/milestones{/number}',
        notifications_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/notifications{?since,all,participating}',
        labels_url: 'https://api.github.com/repos/awsapjsb/serverlessapp2/labels{/name}',
        releases_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/releases{/id}',
        deployments_url:
            'https://api.github.com/repos/awsapjsb/serverlessapp2/deployments',
        created_at: '2021-08-30T09:47:25Z',
        updated_at: '2021-08-30T09:47:26Z',
        pushed_at: '2021-08-30T09:47:26Z',
        git_url: 'git://github.com/awsapjsb/serverlessapp2.git',
        ssh_url: 'git@github.com:awsapjsb/serverlessapp2.git',
        clone_url: 'https://github.com/awsapjsb/serverlessapp2.git',
        svn_url: 'https://github.com/awsapjsb/serverlessapp2',
        homepage: null,
        size: 0,
        stargazers_count: 0,
        watchers_count: 0,
        language: null,
        has_issues: true,
        has_projects: true,
        has_downloads: true,
        has_wiki: true,
        has_pages: false,
        forks_count: 0,
        mirror_url: null,
        archived: false,
        disabled: false,
        open_issues_count: 0,
        license: null,
        forks: 0,
        open_issues: 0,
        watchers: 0,
        default_branch: 'main',
        permissions: {
            admin: true,
            maintain: true,
            push: true,
            triage: true,
            pull: true,
        },
        allow_squash_merge: true,
        allow_merge_commit: true,
        allow_rebase_merge: true,
        allow_auto_merge: false,
        delete_branch_on_merge: false,
        network_count: 0,
        subscribers_count: 1,
    },
};
