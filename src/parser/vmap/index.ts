import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { toS } from "hh-mm-ss";
import ky from "ky";
import type { VMAP, VMAPAdBreak } from "./types";

export type { VMAP, VMAPAdBreak } from "./types";

type GetVMAPParams = {
  url: string;
};

export async function getVMAP({ url }: GetVMAPParams) {
  const USER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
  const text = await ky
    .get(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    })
    .text();
  return parseVMAP(text);
}

function parseVMAP(text: string): VMAP {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");

  const adBreaks: VMAPAdBreak[] = [];

  const nodes = Array.from(doc.getElementsByTagName("vmap:AdBreak"));
  for (const node of nodes) {
    const time = parseTimeOffset(node);
    if (time === undefined) {
      continue;
    }
    adBreaks.push({
      time,
      url: parseVASTUrl(node),
      data: parseVASTData(node),
    });
  }

  return {
    adBreaks,
  };
}

function parseTimeOffset(element: Element) {
  const timeOffset = element.getAttribute("timeOffset");
  if (timeOffset === null) {
    return undefined;
  }
  if (timeOffset === "start") {
    return 0;
  }
  if (timeOffset === "end") {
    // TODO: Have to support postrolls somehow...
    return undefined;
  }
  return toS(timeOffset);
}

function parseVASTUrl(element: Element) {
  const node = element.getElementsByTagName("vmap:AdTagURI")?.[0];
  if (!node) {
    return undefined;
  }
  return node.textContent;
}

function parseVASTData(element: Element) {
  const node = element.getElementsByTagName("vmap:VASTAdData")?.[0];
  if (!node?.firstChild) {
    return undefined;
  }
  const xmlSerializer = new XMLSerializer();
  return xmlSerializer.serializeToString(node.firstChild);
}
