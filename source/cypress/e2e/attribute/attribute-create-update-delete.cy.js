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

describe('Create, update, delete attribute', function () {
    beforeEach(function () {
        cy.fixture('testdata').then(function (testdata) {
            this.testData = testdata;
            cy.loginByCognito(
                Cypress.env('cognitoUsername'),
                Cypress.env('cognitoPassword')
            );
            cy.homePageWithSideNavigation();
        });
    });

    it('Create, update, delete attribute', function () {
        // Create attriute page
        cy.get('a').contains('Attributes').click();
        cy.contains('Add new attribute', { matchCase: false }).click();
        cy.get('#key').type(this.testData.newAttributeKey);
        cy.get('#value').type(this.testData.newAttributeValue);
        cy.get('#description').type(this.testData.newAttributeDescription);
        cy.get('Button').contains('Next').click();

        // Attribute Metadata page
        cy.get('h1').contains('Attribute Metadata').should('be.visible');
        cy.get('Button')
            .contains('Add new item', {
                matchCase: false,
            })
            .click();
        cy.get('#metadata\\[0\\]\\.key').type(this.testData.newAttributeMetaKey);
        cy.get('#metadata\\[0\\]\\.value').type(this.testData.newAttributeMetaValue);
        cy.get('Button').contains('Next').click();

        // Review page
        cy.get('h1').contains('Review').should('be.visible');
        cy.contains(this.testData.newAttributeKey).should('be.visible');
        cy.contains(this.testData.newAttributeValue).should('be.visible');
        cy.contains(this.testData.newAttributeDescription).should('be.visible');
        cy.contains(this.testData.newAttributeMetaKey).should('be.visible');
        cy.contains(this.testData.newAttributeMetaValue).should('be.visible');

        // Submit
        cy.get('Button').contains('Submit').click();

        // Attribute Details
        cy.contains(
            `${this.testData.newAttributeKey}:${this.testData.newAttributeValue}`
        );
        cy.contains(this.testData.newAttributeKey).should('be.visible');
        cy.contains(this.testData.newAttributeValue).should('be.visible');
        cy.contains(this.testData.newAttributeDescription).should('be.visible');
        cy.contains(this.testData.newAttributeMetaKey).should('be.visible');
        cy.contains(this.testData.newAttributeMetaValue).should('be.visible');

        // Update Attribute
        cy.visit('/');
        cy.get('a').contains('Attributes').click();
        cy.get("input[type='search']").type(this.testData.newAttributeKey);
        cy.get(
            `#${this.testData.newAttributeKey}\\:${this.testData.newAttributeValue}`
        ).click();
        cy.get('Button').contains('Update').click();
        cy.get('#description').type('Updated description');
        cy.get('Button').contains('Next').click();
        cy.get('Button').contains('Next').click();
        cy.get('Button').contains('Submit').click();
        cy.contains(`${this.testData.newAttributeDescription}Updated description`).should(
            'be.visible'
        );

        // Delete attribute
        cy.visit('/');
        cy.get('a').contains('Attributes').click();
        cy.get("input[type='search']").type(this.testData.newAttributeKey);
        cy.get(
            `#${this.testData.newAttributeKey}\\:${this.testData.newAttributeValue}`
        ).click();
        cy.get('Button').contains('Delete').click();
        cy.get("input[placeholder='delete']").type('delete');
        cy.get('[data-testid="modal-inner"]').find('Button').contains('Delete').click();
        cy.contains(
            `Delete Attribute ${this.testData.newAttributeKey}:${this.testData.newAttributeValue} Succeeded.`
        ).should('be.visible');
    });
});
