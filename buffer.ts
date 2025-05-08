export const BufferStorageKeys: Set<WeakBufferStorageKey> = new Set<
  WeakBufferStorageKey
>();

const _sym = Symbol.for("BufferStorageKey");

export class WeakBufferStorageKey {
  [_sym]: string;
  constructor(tuid: string) {
    this[_sym] = tuid;
  }
  get id() {
    return this[_sym];
  }
}

export const WeakBufferStorage = new WeakMap<WeakBufferStorageKey, ArrayBuffer>();

export function createBufferStorageKey(tuid: string) {
  const key = new WeakBufferStorageKey(tuid);
  BufferStorageKeys.add(key);
  return key;
}

export function storeBuffer(tuid: string, buffer: ArrayBuffer) {
  const key = createBufferStorageKey(tuid);
  WeakBufferStorage.set(key, buffer);
  BufferStorageKeys.add(key);
  return key;
}

export function getBuffer(tuid: string) {
  const key = BufferStorageKeys.keys().find((k) => k.id === tuid);
  if (!key) return null;
  return WeakBufferStorage.get(key);
}
export function consumeBuffer(tuid: string) {
  const key = BufferStorageKeys.keys().find((k) => k.id === tuid);
  if (!key) return null;
  const buffer = WeakBufferStorage.get(key);
  if (!buffer) return null;
  WeakBufferStorage.delete(key);
  BufferStorageKeys.delete(key);
  return buffer;
}
export function getKey(tuid: string) {
  const key = BufferStorageKeys.keys().find((k) => k.id === tuid);
  if (!key) return null;
  return key;
}

export function deleteBuffer(tuid: string) {
  const key = BufferStorageKeys.keys().find((k) => k.id === tuid);
  if (!key) return null;
  WeakBufferStorage.delete(key);
  BufferStorageKeys.delete(key);
  return true;
}