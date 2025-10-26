import SuperJSON from "superjson";

export function formatSig<T>(data: T) {
  return btoa(SuperJSON.stringify(data));
}

export function parseSig<T>(value: string) {
  return SuperJSON.parse<T>(atob(value));
}
