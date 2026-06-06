const _FROZEN: readonly never[] = Object.freeze([]);

export function emptyArray<T>(): T[] {
  return _FROZEN as unknown as T[];
}
