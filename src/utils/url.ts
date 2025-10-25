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

export function replaceUrlParams(
  inputUrl: string,
  params?: Record<string, string | number | undefined>,
) {
  let url = inputUrl;
  const allParams = {
    ...params,
    // Default params defined below.
    random: Math.floor(Math.random() * 10_000),
  };

  const entries = Object.entries(allParams);
  for (const [key, value] of entries) {
    if (value === undefined) {
      continue;
    }
    url = url.replaceAll(`{${key}}`, value.toString());
  }

  return url;
}
