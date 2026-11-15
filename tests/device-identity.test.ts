import { expect, test } from 'bun:test';
import { DeviceIdentityStore } from '../src/lib/crew/device-identity';
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
test('new tabs recover the same device while astronaut and source identities stay separate', () => {
  const browser = storage();
  const first = new DeviceIdentityStore(
    'ring',
    () => storage(),
    () => browser,
  );
  first.save({ deviceId: 'original', selected: 'nova', deviceName: 'Cabin ring' });
  const reopened = new DeviceIdentityStore(
    'ring',
    () => storage(),
    () => browser,
  );
  expect(reopened.restore('nova')?.deviceId).toBe('original');
  expect(reopened.restore('vega')).toBeNull();
  expect(
    new DeviceIdentityStore(
      'suit',
      () => storage(),
      () => browser,
    ).restore('nova'),
  ).toBeNull();
});
test('legacy tab identity wins over a different astronaut link and migrates to browser storage', () => {
  const tab = storage(),
    browser = storage();
  tab.setItem('zenit-ring-identity', JSON.stringify({ deviceId: 'old', selected: 'nova' }));
  const store = new DeviceIdentityStore(
    'ring',
    () => tab,
    () => browser,
  );
  const identity = store.restore('vega')!;
  expect(identity.selected).toBe('nova');
  store.save(identity);
  expect(
    new DeviceIdentityStore(
      'ring',
      () => storage(),
      () => browser,
    ).restore('nova'),
  ).toEqual(identity);
});
test('corrupt saved identity is preserved and unavailable storage reports a warning', () => {
  const browser = storage();
  browser.setItem('zenit-ring-identity-nova', '{broken');
  const store = new DeviceIdentityStore(
    'ring',
    () => {
      throw Error('unavailable');
    },
    () => browser,
  );
  expect(store.restore('nova')).toBeNull();
  store.save({ deviceId: 'temporary', selected: 'nova' });
  expect(browser.getItem('zenit-ring-identity-nova')).toBe('{broken');
  expect(store.warning).not.toBe('');
});
