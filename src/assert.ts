export function assert<T>(
  value: T,
  message = "value is null",
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw Error(message);
  }
}
