import path from "node:path";

type ResolveUrlParams = {
  baseUrl: string;
  path: string;
};

export function resolveUrl(params: ResolveUrlParams) {
  if (params.path.startsWith("http://") || params.path.startsWith("https://")) {
    // Path appears to be the full url.
    return params.path;
  }

  const url = new URL(params.baseUrl);
  const urlPath = path.parse(url.pathname);

  // Rewrite the path.
  urlPath.base = params.path;
  url.pathname = path.format(urlPath);

  return url.toString();
}
