describe('Admin Login', () => {
  it('logs in and shows dashboard', () => {
    cy.visit('/login');
    cy.get('[data-cy=email]').type('admin@example.com');
    cy.get('[data-cy=password]').type('password123{enter}');
    cy.url().should('include', '/dashboard');
    cy.contains(/poco admin/i).should('be.visible');
  });
});

