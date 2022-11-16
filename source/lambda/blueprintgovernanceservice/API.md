<a name="top"></a>
# Acme project v0.0.0

REST Api

# Table of contents

- [Attribute](#Attribute)
  - [Create attribute](#Create-attribute)
  - [Delete attribute](#Delete-attribute)
  - [Get attribute details](#Get-attribute-details)
  - [List attributes](#List-attributes)
  - [Update attribute](#Update-attribute)
- [Pattern](#Pattern)
  - [Create pattern](#Create-pattern)
  - [Get pattern details](#Get-pattern-details)
  - [List patterns](#List-patterns)
  - [Triggers codepipeline to build failed patterns](#Triggers-codepipeline-to-build-failed-patterns)
  - [Update pattern&#39;s metadata](#Update-pattern&#39;s-metadata)
- [Subscription](#Subscription)
  - [Create notification subscription](#Create-notification-subscription)
  - [Delete notification subscription](#Delete-notification-subscription)
  - [Get subscription for a pattern and email id](#Get-subscription-for-a-pattern-and-email-id)

___


# <a name='Attribute'></a> Attribute

## <a name='Create-attribute'></a> Create attribute
[Back to top](#top)

<p>Create a new attribute</p>

```
POST /attributes
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| key | `String[1..120]` | <p>The key of the attribute</p>_Allowed values: "[0-9a-zA-Z_-]"_ |
| value | `String[1..120]` | <p>The value of the attribute</p>_Allowed values: "[0-9a-zA-Z_-]"_ |
| description | `String[1..1024]` | **optional** <p>The description of the attribute</p> |
| metadata | `Object` | **optional** <p>The metadata of the attribute in JSON format. The maximum length is 7000.</p> |

### Parameters examples

`json` - Request-Example:

```json
{
    "key": "hostingConstruct"
    "value": "Lambda"
    "description": "The application that is mainly based on AWS Lambda Service",
    "metadata": {
       "notes": "Only use it for serverless application"
    }
}
```
### Success response

#### Success response - `Success 201`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| name | `String` | <p>The name of the attribute</p> |
| description | `String` | <p>The description of the attribute</p> |
| key | `String` | <p>The key of the attribute</p> |
| value | `String` | <p>The value of the attribute</p> |
| metadata | `Object` | <p>The metadata of the attribute</p> |
| createTime | `String` | <p>The timestamp when the attribute is created</p> |
| lastUpdateTime | `String` | <p>The timestamp when the attribute is updated last time</p> |

### Success response example

#### Success response example - `Success-Response:`

```json
HTTP/1.1 201 Created
{
     "name": "hostingConstruct:Lambda",
     "key": "hostingConstruct"
     "value": "Lambda"
     "description": "The application that is mainly based on AWS Lambda Service",
     "metadata": {
        "notes": "Only use it for serverless application"
     },
     "createTime": "2021-05-17T07:04:24.102Z",
     "lastUpdateTime": "2021-05-17T07:04:24.102Z"
 }
```

### Error response

#### Error response - `Error 400 - Bad Request`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

#### Error response - `Error 500 - Internal Server Error`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

### Error response example

#### Error response example - `Error-Response-400`

```json
HTTP/1.1 400 Bad Request
{
    "error": "Invalid attribute id. The attribute id must match /^[-\\w]{1,120}:[-\\w]{1,120}$/."",
    "retryable": false
}
```

#### Error response example - `Error-Response-500`

```json
HTTP/1.1 500 Internal Server Error
{
    "error": "Connection failure.",
    "retryable": false
}
```

## <a name='Delete-attribute'></a> Delete attribute
[Back to top](#top)

<p>Delete an existing attribute.</p>

```
DELETE /attributes/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` | <p>id or name of the attribute</p> |
### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` | <p>The id of the deleted attribute</p> |

### Success response example

#### Success response example - `Success-Response:`

```json
HTTP/1.1 200 OK
{
     "id": "HOSTINGCONSTRUCT:EC2",
 }
```

### Error response

#### Error response - `Error 400 - Bad Request`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

#### Error response - `Error 404 - Not Found`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

#### Error response - `Error 500 - Internal Server Error`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

### Error response example

#### Error response example - `Error-Response-400`

```json
HTTP/1.1 400 Bad Request
{
    "error": "Invalid attribute id. The attribute id must match /^[-\\w]{1,120}:[-\\w]{1,120}$/."",
    "retryable": false
}
```

#### Error response example - `Error-Response-404`

```json
HTTP/1.1 404 Not Found
{
    "error": "Specified item is not found. id: TestKey:TestValue",
    "retryable": false
}
```

#### Error response example - `Error-Response-500`

```json
HTTP/1.1 500 Internal Server Error
{
    "error": "Connection failure.",
    "retryable": false
}
```

## <a name='Get-attribute-details'></a> Get attribute details
[Back to top](#top)

<p>Get details of an attribute</p>

```
GET /attributes/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` | <p>id or name of the attribute</p> |
### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| name | `String` | <p>The name of the attribute.</p> |
| description | `String` | <p>The description of the attribute</p> |
| key | `String` | <p>The key of the attribute</p> |
| value | `String` | <p>The value of the attribute</p> |
| metadata | `Object` | <p>The metadata of the attribute</p> |
| createTime | `String` | <p>The timestamp when the attribute is created</p> |
| lastUpdateTime | `String` | <p>The timestamp when the attribute is updated last time</p> |

### Success response example

#### Success response example - `Success-Response:`

```json
HTTP/1.1 200 OK
{
     "name": "hostingConstruct:Lambda",
     "key": "hostingConstruct"
     "value": "Lambda"
     "description": "The pattern that is mainly based on AWS Lambda Service",
     "metadata": {
        "notes": "Only use it for serverless patterns"
     },
     "createTime": "2021-05-17T07:04:24.102Z",
     "lastUpdateTime": "2021-05-17T07:04:24.102Z"
 }
```

### Error response

#### Error response - `Error 400 - Bad Request`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

#### Error response - `Error 404 - Not Found`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

#### Error response - `Error 500 - Internal Server Error`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

### Error response example

#### Error response example - `Error-Response-400`

```json
HTTP/1.1 400 Bad Request
{
    "error": "Invalid attribute id. The attribute id must match /^[-\\w]{1,120}:[-\\w]{1,120}$/."",
    "retryable": false
}
```

#### Error response example - `Error-Response-404`

```json
HTTP/1.1 404 Not Found
{
    "error": "Specified item is not found. id: TestKey:TestValue",
    "retryable": false
}
```

#### Error response example - `Error-Response-500`

```json
HTTP/1.1 500 Internal Server Error
{
    "error": "Connection failure.",
    "retryable": false
}
```

## <a name='List-attributes'></a> List attributes
[Back to top](#top)

<p>List all attributes</p>

```
GET /attributes
```

### Parameters - `Optional Query Parameters`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| key | `String` | **optional** <p>Specify key name to retrieve attributes that have the given key.</p> |
| maxRow | `Number` | **optional** <p>Maximum number of rows in the response page</p>_Default value: 100_<br>_Allowed values: 1-1000_ |
| nextToken | `String` | **optional** <p>Specify the value of the <code>nextToken</code> field in the last response to get the next page.</p> |
### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| results | `Object[]` | <p>results</p> |
| results.name | `String` | <p>The name of the attribute</p> |
| results.description | `String` | <p>The description of the attribute</p> |
| results.key | `String` | <p>The key of the attribute</p> |
| results.value | `String` | <p>The value of the attribute</p> |
| results.metadata | `Object` | <p>The metadata of the attribute</p> |
| results.createTime | `String` | <p>The timestamp when the attribute is created</p> |
| results.lastUpdateTime | `String` | <p>The timestamp when the attribute is updated last time</p> |
| nextToken | `UUID` | **optional**<p>The token for retrieving next page</p> |

### Success response example

#### Success response example - `Success-Response:`

```json
HTTP/1.1 200 OK
{
  "results": [
      {
         "name": "hostingConstruct:Lambda",
         "key": "hostingConstruct"
         "value": "Lambda"
         "description": "The pattern that is mainly based on AWS Lambda Service",
         "metadata": {
            "notes": "Only use it for serverless pattern"
         },
         "createTime": "2021-05-17T07:04:24.102Z",
         "lastUpdateTime": "2021-05-17T07:04:24.102Z"
      },
      {
         "name": "hostingConstruct:EC2",
         "key": "hostingConstruct"
         "value": "EC2"
         "description": "The pattern that is mainly based on AWS EC2",
         "metadata": {
            "notes": "Only use it for pattern that requires linux OS"
         },
         "createTime": "2021-05-17T07:04:24.102Z",
         "lastUpdateTime": "2021-05-17T07:04:24.102Z"
      },
  ],
  "nextToken": "5f55c3f4-792e-4ae0-a7a5-76541f8d5ebb"
}
```

### Error response

#### Error response - `Error 400 - Bad Request`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

#### Error response - `Error 500 - Internal Server Error`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

### Error response example

#### Error response example - `Error-Response-400`

```json
HTTP/1.1 400 Bad Request
{
    "error": "Invalid attribute id. The attribute id must match /^[-\\w]{1,120}:[-\\w]{1,120}$/."",
    "retryable": false
}
```

#### Error response example - `Error-Response-500`

```json
HTTP/1.1 500 Internal Server Error
{
    "error": "Connection failure.",
    "retryable": false
}
```

## <a name='Update-attribute'></a> Update attribute
[Back to top](#top)

<p>Update an existing attribute. This will replace the current attribute entirly, so all parameters need to be specified.</p>

```
PUT /attributes/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| key | `String[1..120]` | <p>The key of the attribute</p>_Allowed values: "[0-9a-zA-Z_-]"_ |
| value | `String[1..120]` | <p>The value of the attribute</p>_Allowed values: "[0-9a-zA-Z_-]"_ |
| description | `String[1..1024]` | **optional** <p>The description of the attribute</p> |
| metadata | `Object` | **optional** <p>The metadata of the attribute in JSON format. The maximum length is 7000.</p> |

### Parameters examples

`json` - Request-Example:

```json
{
    "key": "hostingConstruct"
    "value": "Lambda"
    "description": "The application that is mainly based on AWS Lambda Service",
    "metadata": {
       "notes": "Only use it for serverless application"
    }
}
```
### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| name | `String` | <p>The name of the attribute</p> |
| description | `String` | <p>The description of the attribute</p> |
| key | `String` | <p>The key of the attribute</p> |
| value | `String` | <p>The value of the attribute</p> |
| metadata | `Object` | <p>The metadata of the attribute</p> |
| createTime | `String` | <p>The timestamp when the attribute is created</p> |
| lastUpdateTime | `String` | <p>The timestamp when the attribute is updated last time</p> |

### Success response example

#### Success response example - `Success-Response:`

```json
HTTP/1.1 200 OK
{
     "name": "hostingConstruct:Lambda",
     "key": "hostingConstruct"
     "value": "Lambda"
     "description": "The application that is mainly based on AWS Lambda Service",
     "metadata": {
        "notes": "Only use it for serverless application"
     },
     "createTime": "2021-05-17T07:04:24.102Z",
     "lastUpdateTime": "2021-05-17T07:04:24.102Z"
 }
```

### Error response

#### Error response - `Error 400 - Bad Request`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

#### Error response - `Error 404 - Not Found`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

#### Error response - `Error 500 - Internal Server Error`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

### Error response example

#### Error response example - `Error-Response-400`

```json
HTTP/1.1 400 Bad Request
{
    "error": "Invalid attribute id. The attribute id must match /^[-\\w]{1,120}:[-\\w]{1,120}$/."",
    "retryable": false
}
```

#### Error response example - `Error-Response-404`

```json
HTTP/1.1 404 Not Found
{
    "error": "Specified item is not found. id: TestKey:TestValue",
    "retryable": false
}
```

#### Error response example - `Error-Response-500`

```json
HTTP/1.1 500 Internal Server Error
{
    "error": "Connection failure.",
    "retryable": false
}
```

# <a name='Pattern'></a> Pattern

## <a name='Create-pattern'></a> Create pattern
[Back to top](#top)

<p>Creates new pattern</p>

```
POST /patterns
```

### Parameters - `RequestBody`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| name | `String` | <p>Pattern's Name</p> |
| description | `String` | <p>Pattern's Description</p> |
| patternType | `String` | <p>Pattern Type i.e. CDK or CFN</p> |
| attributes | `Object` | <p>JSON Object</p> |

### Success response example

#### Success response example - `Success-Response:`

```json
     HTTP/1.1 201 Created
API Headers {"Access-Control-Allow-Origin":"*","X-Amzn-Trace-Id":"Root=1-6168f480-0bd8024e6ceb2ff2602efa94;Sampled=1","Content-Type":"application/json"}
{
        "patternObject": {
            "patternId": "sample-pattern1",
            "name": "sample-pattern1",
            "description": "test pattern",
            "patternType": "CFN",
            "updatedTimestamp": "2022-09-16T07:01:02.145Z",
            "createdTimestamp": "2022-09-16T07:01:02.145Z",
            "infrastructureStackStatus": "CREATE_IN_PROGRESS",
            "patternRepoURL": "git://dev.github-enterprise.abc/enterprise/sample-pattern1.git",
            "attributes": {
                "DataClassification": "PII",
                "SecurityLevel": "Medium"
            },
            "codeRepository": {
                "type": "github",
                "repoOwner": "enterprise",
                "branchName": "master",
                "repoName": "sample-pattern1"
            }
        }
     }
```

## <a name='Get-pattern-details'></a> Get pattern details
[Back to top](#top)

<p>Get pattern details</p>

```
GET /patterns/{id}
```

### Success response example

#### Success response example - `Success-Response:`

```json
HTTP/1.1 200 OK
{
       "metadata": {
           "codeRepository": {
               "branchName": "master",
               "type": "github",
               "repoOwner": "enterprise",
               "repoName": "sample-pattern"
           },
           "updatedTimestamp": "2022-09-16T06:34:33.648Z",
           "lastCommitId": "5291a66986299b60536e1d944a82f6edaa88287e",
           "attributes": {
               "DataClassification": "PII",
               "SecurityLevel": "Medium"
           },
           "patternType": "CFN",
           "description": "test decription",
           "name": "sample-pattern",
           "createdTimestamp": "2022-09-16T04:17:10.656Z",
           "patternRepoURL": "git://dev.github-enterprise.abc/enterprise/sample-pattern.git",
           "infrastructureStackStatus": "CREATE_COMPLETE",
           "patternId": "sample-pattern"
       },
       "lastCommitPublishData": {
           "allPackages": [
               {
                   "name": "@sample-pattern/dynamodb-pattern",
                   "version": "1.0.2"
               }
           ],
           "updatedTimestamp": "2022-09-16T06:34:33.648Z",
           "changedPackages": [
               {
                   "name": "@sample-pattern/dynamodb-pattern",
                   "version": "1.0.2"
               }
           ],
           "artifacts": [
               {
                   "type": "CONTROL",
                   "name": "cfn_nag.txt",
                   "location": "sample-pattern/5291a66986299b60536e1d944a82f6edaa88287e/controls/cfn_nag.txt"
               },
               {
                   "type": "MARKDOWN",
                   "name": "README.md",
                   "location": "sample-pattern/5291a66986299b60536e1d944a82f6edaa88287e/markdown/README.md"
               }
           ],
           "serviceCatalogProducts": [
               {
                   "name": "sample-pattern_@sample-pattern/dynamodb-pattern",
                   "region": "ap-southeast-2",
                   "productId": "prod-otgvptp6uh6nc",
                   "account": "111111111111",
                   "provisioningArtifactId": "pa-y6vhyv6t6j4aa"
               }
           ],
           "commitMessage": "Merge pull request #2 from enterprise/feature  initial commit",
           "createdTimestamp": "2022-09-16T06:34:33.648Z",
           "commitId": "5291a66986299b60536e1d944a82f6edaa88287e",
           "patternId": "sample-pattern"
       }
     }
```

## <a name='List-patterns'></a> List patterns
[Back to top](#top)

<p>List all patterns</p>

```
GET /patterns
```

### Success response example

#### Success response example - `Success-Response:`

```json
     HTTP/1.1 200 OK
   {
  "results": [
    {
      "patternMetaData": {
        "codeRepository": {
          "branchName": "master",
          "type": "github",
          "repoOwner": "enterprise",
          "repoName": "sample-pattern"
        },
        "updatedTimestamp": "2022-09-16T06:34:33.648Z",
        "lastCommitId": "5291a66986299b60536e1d944a82f6edaa88287e",
        "attributes": {
          "DataClassification": "PII",
          "SecurityLevel": "Medium"
        },
        "patternType": "CFN",
        "description": "decription",
        "name": "sample-pattern",
        "createdTimestamp": "2022-09-16T04:17:10.656Z",
        "patternRepoURL": "git://dev.github-enterprise.abc/enterprise/sample-pattern.git",
        "infrastructureStackStatus": "CREATE_COMPLETE",
        "patternId": "sample-pattern"
      },
      "lastCommitPublishData": {
        "allPackages": [
          {
            "name": "@my-cfn/dynamodb",
            "version": "1.0.2"
          }
        ],
        "updatedTimestamp": "2022-10-25T02:53:14.535Z",
        "changedPackages": [
          {
            "name": "@my-cfn/dynamodb",
            "version": "1.0.2"
          }
        ],
        "artifacts": [
          {
            "type": "CONTROL",
            "name": "cfn_nag.txt",
            "location": "sample-pattern/29c26261aa732dd9851258c89a6c375af7cf3d0d/controls/cfn_nag.txt"
          },
          {
            "type": "IMAGE",
            "name": "architecture.png",
            "location": "sample-pattern/29c26261aa732dd9851258c89a6c375af7cf3d0d/images/architecture.png"
          },
          {
            "type": "MARKDOWN",
            "name": "README.md",
            "location": "sample-pattern/29c26261aa732dd9851258c89a6c375af7cf3d0d/markdown/README.md"
          },
          {
            "type": "MARKDOWN",
            "name": "USAGE.md",
            "location": "sample-pattern/29c26261aa732dd9851258c89a6c375af7cf3d0d/markdown/USAGE.md"
          }
        ],
        "serviceCatalogProducts": [
          {
            "name": "sample-pattern_@my-cfn/dynamodb",
            "region": "ap-southeast-2",
            "productId": "prod-42323232dsd",
            "account": "xxxxxxxxxxxx",
            "provisioningArtifactId": "pa-1111aaaassss"
          }
        ],
        "commitMessage": "Merge pull request #1 from test/feature new templates added",
        "createdTimestamp": "2022-10-25T02:53:14.535Z",
        "commitId": "29c26261aa732dd9851258c89a6c375af7cf3d0d",
        "patternId": "sample-pattern"
      }
    }
  ]
}
```

## <a name='Triggers-codepipeline-to-build-failed-patterns'></a> Triggers codepipeline to build failed patterns
[Back to top](#top)

<p>Triggers codepipeline to build failed patterns</p>

```
PUT /patterns/pipeline/{id}
```

### Parameters - `RequestBody`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` | <p>Pattern's name</p> |

### Success response example

#### Success response example - `Success-Response:`

```json
     HTTP/1.1 201 Created
API Headers {"Access-Control-Allow-Origin":"*","X-Amzn-Trace-Id":"Root=1-6168f480-0bd8024e6ceb2ff2602efa94;Sampled=1","Content-Type":"application/json"}
{
        "codeRepository": {
            "branchName": "master",
            "type": "github",
            "repoOwner": "enterprise",
            "repoName": "sample-pattern"
        },
        "updatedTimestamp": "2022-09-16T06:25:59.256Z",
        "attributes": {
            "DataClassification": "PII"
        },
        "patternType": "CFN",
        "description": "",
        "createdTimestamp": "2022-09-16T06:25:59.256Z",
        "name": "sample-pattern",
        "patternRepoURL": "git://dev.github-enterprise.abc/enterprise/sample-pattern.git",
        "infrastructureStackStatus": "CREATE_IN_PROGRESS",
        "patternId": "sample-pattern"
     }
```

## <a name='Update-pattern&#39;s-metadata'></a> Update pattern&#39;s metadata
[Back to top](#top)

<p>Update pattern's metadata</p>

```
PUT /patterns/:id
```

### Parameters - `RequestBody`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| description | `String` | <p>Pattern's Description</p> |
| attributes | `Object` | <p>JSON Object</p> |

### Success response example

#### Success response example - `Success-Response:`

```json
     HTTP/1.1 200 OK
API Headers {"Access-Control-Allow-Origin":"*","X-Amzn-Trace-Id":"Root=1-6168f480-0bd8024e6ceb2ff2602efa94;Sampled=1","Content-Type":"application/json"}
{
        "patternObject": {
            "patternId": "sample-pattern1",
            "name": "sample-pattern1",
            "description": "test pattern",
            "patternType": "CFN",
            "updatedTimestamp": "2022-09-16T07:01:02.145Z",
            "createdTimestamp": "2022-09-16T07:01:02.145Z",
            "infrastructureStackStatus": "CREATE_IN_PROGRESS",
            "patternRepoURL": "git://dev.github-enterprise.abc/enterprise/sample-pattern1.git",
            "attributes": {
                "DataClassification": "PII",
                "SecurityLevel": "Medium"
            },
            "codeRepository": {
                "type": "github",
                "repoOwner": "enterprise",
                "branchName": "master",
                "repoName": "sample-pattern1"
            }
        }
     }
```

# <a name='Subscription'></a> Subscription

## <a name='Create-notification-subscription'></a> Create notification subscription
[Back to top](#top)

<p>Creates a new notification subscription</p>

```
POST /subscriptions
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| patternId | `UUID` | <p>The pattern's id.</p> |
| email | `String` | <p>The subscription destination email address.</p> |

### Error response

#### Error response - `Error 400 - Bad Request`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

#### Error response - `Error 500 - Internal Server Error`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

### Error response example

#### Error response example - `Error-Response-400`

```json
HTTP/1.1 400 Bad Request
{
    "error": "Invalid attribute id. The attribute id must match /^[-\\w]{1,120}:[-\\w]{1,120}$/."",
    "retryable": false
}
```

#### Error response example - `Error-Response-500`

```json
HTTP/1.1 500 Internal Server Error
{
    "error": "Connection failure.",
    "retryable": false
}
```

## <a name='Delete-notification-subscription'></a> Delete notification subscription
[Back to top](#top)

<p>Deletes a notification subscription</p>

```
DELETE /subscriptions
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| patternId | `UUID` | <p>The pattern's id.</p> |
| email | `String` | <p>The subscription destination email address.</p> |

### Error response

#### Error response - `Error 400 - Bad Request`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

#### Error response - `Error 500 - Internal Server Error`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| error | `String` | <p>Error message</p> |
| retryable | `Boolean` | <p>Indicate if the request can be retryable</p> |

### Error response example

#### Error response example - `Error-Response-400`

```json
HTTP/1.1 400 Bad Request
{
    "error": "Invalid attribute id. The attribute id must match /^[-\\w]{1,120}:[-\\w]{1,120}$/."",
    "retryable": false
}
```

#### Error response example - `Error-Response-500`

```json
HTTP/1.1 500 Internal Server Error
{
    "error": "Connection failure.",
    "retryable": false
}
```

## <a name='Get-subscription-for-a-pattern-and-email-id'></a> Get subscription for a pattern and email id
[Back to top](#top)

<p>Returns subscription data for a pattern and email id</p>

```
GET /subscriptions
```

### Parameters - `Query string`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| patternId | `String` | <p>Pattern Id</p> |
| email | `String` | <p>Subscriber's email address</p> |

### Success response example

#### Success response example - `Success-Response:`

```json
HTTP/1.1 200 OK
{
        "email": "test@testdomain.com",
        "patternId": "test-pattern-id"
     }
```

