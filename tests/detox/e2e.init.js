/* global device */

beforeAll(async () => {
  await device.launchApp({ delete: true, newInstance: true });
});

beforeEach(async () => {
  await device.reloadReactNative();
});

