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

describe('Create and publish CDK pattern', function () {
    beforeEach(function () {
        cy.fixture('testdata').then(function (testdata) {
            this.testData = testdata;
            cy.task('deleteDummyAttributesForTest', {
                attributeKey: testdata.cdkTestAttributeKey,
                attributeValue: testdata.cdkTestAttributeValue,
            });
            cy.wait(4000);
            cy.task('createDummyAttributesForTest', {
                attributeKey: testdata.cdkTestAttributeKey,
                attributeValue: testdata.cdkTestAttributeValue,
                attributeDescription: testdata.testAttributeDescription,
            });
        });
        cy.loginByCognito(Cypress.env('cognitoUsername'), Cypress.env('cognitoPassword'));
        cy.homePageWithSideNavigation();
    });

    it('Create CDK pattern and publish initial version', function () {
        // Create pattern page
        cy.createPatternPage(
            this.testData.cdkPatternName,
            'CDK',
            this.testData.patternDescription
        );
        // Attribute selection page
        cy.selectAttributes(
            this.testData.cdkTestAttributeKey,
            this.testData.cdkTestAttributeValue
        );
        // Review page
        cy.reviewPageValidation(
            this.testData.cdkPatternName,
            'CDK',
            this.testData.patternDescription,
            this.testData.cdkTestAttributeKey,
            this.testData.cdkTestAttributeValue
        );
        // Wait to allow repo creation and trigger CodeBuild to provision publishing pipeline
        cy.wait(8000);
        // Pattern Details page
        cy.patternDetailsPageValidation(
            this.testData.cdkPatternName,
            'CDK',
            this.testData.patternDescription,
            this.testData.cdkTestAttributeKey,
            this.testData.cdkTestAttributeValue
        );
        // Wait for publish pipeline to be create, usually takes about 10-11 mins
        cy.wait(11 * 60 * 1000);
        cy.visit('/');
        cy.get('a').contains(this.testData.cdkPatternName).click();
        cy.contains('Ready');
        // Simulates PR and code merge into master branch
        cy.task('commitAndPushToPatternRepo', {
            patternName: this.testData.cdkPatternName,
            patternType: 'cdk',
        });
        // Wait for pattern's publishing pipeline to complete
        cy.wait(12 * 60 * 1000);
        // assert the packages appear on the pattern detail page
        cy.visit('/');
        cy.get('a').contains(this.testData.cdkPatternName).click();
        cy.get('h3').contains('Packages (2)').should('be.visible').click();
        cy.contains('@cypress-cdk/compliant-dynamodbtable').should('be.visible');
        cy.contains('@cypress-cdk/compliant-s3-bucket').should('be.visible');

        // update pattern description
        cy.get('Button').contains('Edit').click();
        cy.get('#description').type('Updated description');
        cy.get('Button').contains('Next').click();
        cy.get('Button').contains('Next').click();
        cy.get('Button').contains('Submit').click();
        cy.contains('Updated description');

        // cleanup
        cy.task(
            'deletePattern',
            {
                patternName: this.testData.cdkPatternName,
                patternType: 'cdk',
            },
            {
                timeout: 90 * 60 * 1000,
            }
        );
        // Pattern should not exist on patterns list page
        cy.visit('/');
        cy.get("input[type='search']").type(this.testData.cdkPatternName);
        cy.contains(this.testData.cdkPatternName).should('not.exist');
    });
});
