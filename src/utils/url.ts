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

export function getUrlCommonPrefix(urls: string[]) {
  if (!urls.length) {
    return "";
  }

  const value = urls.reduce((prefix, url) => {
    if (!prefix || !url) {
      return "";
    }
    let i = 0;
    const minLength = Math.min(prefix.length, url.length);
    while (i < minLength && prefix[i] === url[i]) {
      i++;
    }
    const lastSlash = prefix.lastIndexOf("/", i - 1);
    return lastSlash >= 0 ? prefix.slice(0, lastSlash + 1) : "";
  }, urls[0]);

  return value ?? "";
}
