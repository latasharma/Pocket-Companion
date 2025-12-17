/* global device, element, by, expect */

describe('PoCo onboarding & SOS flow', () => {
  it('completes onboarding and lands on home screen', async () => {
    await expect(element(by.id('onboarding-welcome'))).toBeVisible();
    await element(by.id('onboarding-next')).tap();
    await element(by.id('input-name')).typeText('Lata\n');
    await element(by.id('onboarding-finish')).tap();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('triggers SOS button and shows confirmation', async () => {
    await element(by.id('sos-button')).tap();
    await expect(element(by.text('Alert sent to your trusted contacts'))).toBeVisible();
  });
});

