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

/// <reference types="cypress" />

// Amazon Cognito
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const loginToCognito = (username, password) => {
    Cypress.log({
        displayName: 'COGNITO LOGIN',
        message: [`🔐 Authenticating | ${username}`],
        autoEnd: false,
    });

    cy.visit('/');
    cy.contains('Sign in', {
        includeShadowDom: true,
    }).click();

    cy.origin(
        Cypress.env('cognitoDomain'),
        {
            args: {
                username,
                password,
            },
        },
        ({ username, password }) => {
            // Cognito log in page has some elements of the same id but are off screen.
            // We only want the visible elements to log in
            cy.get('input[name="username"]:visible').type(username);
            cy.get('input[name="password"]:visible').type(password, {
                // use log: false to prevent your password from showing in the Command Log
                log: false,
            });
            cy.get('input[name="signInSubmitButton"]:visible').click();
        }
    );

    // give a few seconds for redirect to settle
    cy.wait(4000);

    // verify we have made it passed the login screen
    cy.contains('Create new Pattern').should('be.visible');
};

// Home page with side navigation clicked
Cypress.Commands.add('homePageWithSideNavigation', () => {
    cy.visit('/');
    cy.get('button').get('[data-testid=open-nav-drawer]').filter(':visible').click();
});

// Login and store token id in session
Cypress.Commands.add('loginByCognito', (username, password) => {
    cy.session(
        `cognito-${username}`,
        () => {
            loginToCognito(username, password);
        },
        {
            validate() {
                cy.visit('/');
                // revalidate our session to make sure we are logged in
                cy.contains('Create new Pattern').should('be.visible');
            },
        }
    );
});

// Create pattern page
Cypress.Commands.add('createPatternPage', (patternName, patternType, description) => {
    cy.contains('Application Pattern Orchestrator on AWS').should('be.visible');
    cy.contains('Create new Pattern', { matchCase: false }).click();
    cy.get('#name').type(patternName);
    cy.get(`input[name='patternType'][value='${patternType.toUpperCase()}']`).click();
    cy.get('#description').type(description);
    cy.get('Button').contains('Next').click();
});

// Select Attribute
Cypress.Commands.add('selectAttributes', (attributeKey, attributeValue) => {
    cy.contains('Add new item').should('be.visible').click();
    cy.get('#attributes\\[0\\]\\.key').click();
    cy.contains(attributeKey).click();
    cy.get('#attributes\\[0\\]\\.value').click();
    cy.contains(attributeValue).click();
    cy.get('Button').contains('Next').click();
});

// validate review page
Cypress.Commands.add(
    'reviewPageValidation',
    (patternName, patternType, description, attributeKey, attributeValue) => {
        cy.get('h1').contains('Review').should('be.visible');
        cy.get('h3').contains('General Information');
        cy.contains('Name');
        cy.contains(patternName);
        cy.contains('Pattern Type', {
            matchCase: false,
        });
        cy.contains(patternType, {
            matchCase: false,
        });
        cy.contains('Description');
        cy.contains(description);
        cy.get('h3').contains('Attributes (1)').click();
        cy.contains(attributeKey);
        cy.contains(attributeValue);
        cy.get('Button').contains('Submit').click();
    }
);

// pattern details page validation
Cypress.Commands.add(
    'patternDetailsPageValidation',
    (patternName, patternType, description, attributeKey, attributeValue) => {
        cy.contains('Name', {
            timeout: 10000,
        });
        cy.contains(patternName);
        cy.contains('Pattern Type', {
            matchCase: false,
        });
        cy.contains(patternType, {
            matchCase: false,
        });
        cy.contains('Description');
        cy.contains(description);
        cy.get('h3').contains('Attributes (1)').click();
        cy.contains(attributeKey);
        cy.contains(attributeValue);
        cy.contains('Pattern Pipeline Status');
        cy.contains('Creating');
    }
);
