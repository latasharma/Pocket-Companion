/// <reference types="cypress" />

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/signin');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="sign-in-button"]').click();
  cy.url().should('not.include', '/signin');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="profile-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/signin');
});

Cypress.Commands.add('waitForApiCall', (alias: string) => {
  cy.wait(`@${alias}`, { timeout: 10000 });
});

export {};

