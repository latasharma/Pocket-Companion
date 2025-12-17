describe('User management', () => {
  beforeEach(() => {
    cy.loginAsAdmin(); // create a custom command in support if you want
  });

  it('shows user list with basic info', () => {
    cy.visit('/dashboard/users');
    cy.contains(/users/i).should('be.visible');
    cy.get('[data-cy=user-row]').should('have.length.at.least', 1);
  });
});

