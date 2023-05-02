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

describe('Create pattern form validation', function () {
    beforeEach(function () {
        cy.fixture('testdata').then(function (testdata) {
            this.testData = testdata;
            cy.task('deleteDummyAttributesForTest', {
                attributeKey: testdata.formValidationTestAttributeKey,
                attributeValue: testdata.formValidationTestAttributeValue,
            });
            cy.wait(4000);
            cy.task('createDummyAttributesForTest', {
                attributeKey: testdata.formValidationTestAttributeKey,
                attributeValue: testdata.formValidationTestAttributeValue,
            });
        });
        cy.loginByCognito(Cypress.env('cognitoUsername'), Cypress.env('cognitoPassword'));
        cy.homePageWithSideNavigation();
    });

    it('Pattern form validation', function () {
        // validate Create pattern page
        cy.contains('Create new Pattern', { matchCase: false }).click();
        cy.contains('Required').should('not.exist');
        cy.get('Button').contains('Next').click();
        cy.contains('Required').should('exist');
        cy.get('#name').type(this.testData.cfnPatternName);
        cy.get(`input[name='patternType'][value='CFN']`).click();
        cy.get('#description').type(this.testData.patternDescription);
        cy.get('Button').contains('Next').click();

        // validate Select Attribute page
        cy.get('h1').contains('Select Attribute').should('exist');
        cy.contains('Required').should('not.exist');
        cy.get('Button')
            .contains('Add new item', {
                matchCase: false,
            })
            .click();
        cy.get('Button').contains('Next').click();
        cy.contains('Required').should('exist');
        cy.get('#attributes\\[0\\]\\.key').click();
        cy.contains(this.testData.formValidationTestAttributeKey).click();
        cy.get('#attributes\\[0\\]\\.value').click();
        cy.contains(this.testData.formValidationTestAttributeValue).click();
        cy.get('Button').contains('Next').click();
        cy.get('h1').contains('Review').should('exist');
    });
});
