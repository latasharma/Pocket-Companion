describe('CONNECT Landing Page', () => {
  it('displays the CONNECT hero section', () => {
    cy.visit('/connect');
    cy.contains(/more than just ai/i).should('be.visible');
    cy.contains(/introducing connect/i).should('be.visible');
  });

  it('shows all three feature cards', () => {
    cy.visit('/connect');
    cy.contains(/shared interests/i).should('be.visible');
    cy.contains(/group activities/i).should('be.visible');
    cy.contains(/supportive community/i).should('be.visible');
  });

  it('displays safety guidelines', () => {
    cy.visit('/connect');
    cy.contains(/your safety is our priority/i).should('be.visible');
    cy.contains(/never meet someone one-on-one/i).should('be.visible');
    cy.contains(/group meetings only/i).should('be.visible');
  });

  it('has proper images with alt text', () => {
    cy.visit('/connect');
    cy.get('img[alt*="Shared Interests"]').should('be.visible');
    cy.get('img[alt*="Group Activities"]').should('be.visible');
    cy.get('img[alt*="Supportive Community"]').should('be.visible');
  });

  it('displays safety warning prominently', () => {
    cy.visit('/connect');
    cy.contains(/⚠️/i).should('be.visible');
    cy.contains(/never meet someone one-on-one from the app/i).should('be.visible');
  });

  it('shows all safety guidelines', () => {
    cy.visit('/connect');
    cy.contains(/public places/i).should('be.visible');
    cy.contains(/inform trusted contacts/i).should('be.visible');
    cy.contains(/protect your information/i).should('be.visible');
    cy.contains(/report concerns/i).should('be.visible');
  });
});

