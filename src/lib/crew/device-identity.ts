import { crewDefaults } from './model';

type Identity = { deviceId: string; selected: string; deviceName?: string };
type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

// Keep the legacy tab identity first so queued evidence never changes astronaut.
// A browser copy lets a newly opened tab recover the same device and outbox.
export class DeviceIdentityStore {
  warning = '';
  private unreadable = new Set<string>();
  constructor(
    private source: 'ring' | 'suit',
    private tab: StorageAccess = () => sessionStorage,
    private browser: StorageAccess = () => localStorage,
  ) {}
  private get key() {
    return `zenit-${this.source}-identity`;
  }
  private read(storage: StorageAccess, key: string): Identity | null {
    try {
      const raw = storage().getItem(key);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (
        !saved ||
        typeof saved.deviceId !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(saved.deviceId) ||
        !crewDefaults.some((c) => c.id === saved.selected) ||
        (saved.deviceName !== undefined && typeof saved.deviceName !== 'string')
      )
        throw Error('Invalid device identity');
      return saved;
    } catch {
      this.unreadable.add(key);
      this.warning =
        'Device identity could not be restored. Keep this tab open until pending events are confirmed.';
      return null;
    }
  }
  restore(selected: string, includeTab = true): Identity | null {
    const saved = includeTab ? this.read(this.tab, this.key) : null;
    if (saved) return saved;
    const durable = this.read(this.browser, `${this.key}-${selected}`);
    return durable?.selected === selected ? durable : null;
  }
  save(identity: Identity) {
    for (const [storage, key] of [
      [this.tab, this.key],
      [this.browser, `${this.key}-${identity.selected}`],
    ] as const) {
      this.read(storage, key);
      if (this.unreadable.has(key)) continue;
      try {
        storage().setItem(key, JSON.stringify(identity));
      } catch {
        this.warning =
          'Device identity is temporary. Keep this tab open until pending events are confirmed.';
      }
    }
  }
}
