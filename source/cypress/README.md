# Cypress e2e Testing 

## Pre-req:
- Google Chrome installed

## Environment variables
The cypress tests extracts away the configuration to environment variables. It is a pre-requisite that the below environments are available to the tests before they are executed:

| Environment variable | Description | Required |
|----------------------| ------------|----------|
|`BASE_URL`| The base url of the test environment UI| Yes | 
|`AWS_COGNITO_USERNAME`| AWS Cognito user name for login| Yes | 
|`AWS_COGNITO_DOMAIN`| AWS Cognito domain| Yes | 
|`AWS_COGNITO_REGION`| AWS Cognito region| Yes | 
|`AWS_COGNITO_USER_POOLS_ID`| AWS Cognito user pool id| Yes | 
|`AWS_COGNITO_USER_POOL_APP_CLIENT_ID`| AWS Cognito user pool app client id| Yes | 
|`GITHUB_BASE_URL`| GitHub enterprise server base url. Not required for GitHub/GitHub cloud | Optional | 
|`GITHUB_ORG`| GitHub organisation| Yes | 
|`GITHUB_TOKEN`| GitHub token. This should have delete repo access as the tests deleted the test repo at the end of the tests| Yes | 

## Local testing
For local testing, please create a local file `.env.local` with all the above environment variables defined under `source/` directory where cypress.config.js exists. Please don't commit this file to the source code repo. This is for your local testing only.

## Folder structure
Reference: https://docs.cypress.io/guides/references/configuration#Folders-Files

```
.
├── downloads (Path to folder where files downloaded during a test are saved
)
├── fixtures (for static data in json format you want to load into tests).
├── e2e (test specs are located here)
├── screenshots  (failed test screenshots)
├── support (any reusable commands should go here)
├── testing-data 
└── videos
```
## How to run the tests
To run headlessly use the below command:
`npm run cy:run`

To run in a browser use the below command:
`npm run cy:open`

