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

describe('Create Attribute form validation', function () {
    beforeEach(function () {
        cy.fixture('testdata').then(function (testdata) {
            cy.log(testdata.testAttributeKey);
            this.testData = testdata;
        });
        cy.loginByCognito(Cypress.env('cognitoUsername'), Cypress.env('cognitoPassword'));
        cy.homePageWithSideNavigation();
    });

    it('Attribute form validation', function () {
        // Create attriute page
        cy.get('a').contains('Attributes').click();
        cy.contains('Required').should('not.exist');
        cy.contains('Add new attribute', { matchCase: false }).click();
        cy.get('Button').contains('Next').click();
        cy.contains('Required').should('exist');
        cy.get('#key').type(this.testData.newAttributeKey);
        cy.get('#value').type(this.testData.newAttributeValue);
        cy.get('#description').type(this.testData.newAttributeDescription);
        cy.contains('Required').should('not.exist');
        cy.get('Button').contains('Next').click();

        // Attribute Metadata page
        cy.get('h1').contains('Attribute Metadata').should('be.visible');
        cy.get('Button')
            .contains('Add new item', {
                matchCase: false,
            })
            .click();
        cy.get('Button').contains('Next').click();
        cy.contains('Required').should('exist');
        cy.get('#metadata\\[0\\]\\.key').type(this.testData.newAttributeMetaKey);
        cy.get('#metadata\\[0\\]\\.value').type(this.testData.newAttributeMetaValue);
        cy.contains('Required').should('not.exist');
        cy.get('Button').contains('Next').click();

        // Review page
        cy.get('h1').contains('Review').should('be.visible');
    });
});
