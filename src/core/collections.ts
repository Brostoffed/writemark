/** Read an entry after the caller establishes its array bounds. */
export function requireItem<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new RangeError(`Missing array entry at ${index}.`);
  return item;
}
