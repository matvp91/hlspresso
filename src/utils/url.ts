import path from "node:path";

export function resolveUrl(baseUrl: string, pathToAppend: string) {
  if (
    pathToAppend.startsWith("http://") ||
    pathToAppend.startsWith("https://")
  ) {
    return pathToAppend;
  }
  const url = new URL(baseUrl);
  const parsedPath = path.parse(url.pathname);
  parsedPath.base = pathToAppend;
  url.pathname = path.format(parsedPath);
  return url.toString();
}
