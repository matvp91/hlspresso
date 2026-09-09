import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { toS } from "hh-mm-ss";
import ky, { isHTTPError, isTimeoutError } from "ky";
import { ApiError } from "../error";

export type VMAPAdBreak = {
  time: number;
  adTagUri?: string;
  vastAdData?: string;
};

export type VMAP = {
  adBreaks: VMAPAdBreak[];
};

type GetVMAPParams = {
  url: string;
};

export async function getVMAP({ url }: GetVMAPParams) {
  const USER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
  let text: string;
  try {
    text = await ky
      .get(url, {
        headers: {
          "User-Agent": USER_AGENT,
        },
      })
      .text();
  } catch (cause) {
    let message = "Could not fetch the VMAP response.";
    if (isHTTPError(cause)) {
      message = `Could not fetch the VMAP response: the server returned HTTP ${cause.response.status}.`;
    } else if (isTimeoutError(cause)) {
      message = "Could not fetch the VMAP response: the request timed out.";
    }
    throw new ApiError({ code: "FETCH_VMAP_FAILED", message, cause });
  }

  try {
    return parseVMAP(text);
  } catch (cause) {
    throw new ApiError({
      code: "INVALID_VMAP_RESPONSE",
      message: "The VMAP response is invalid or unsupported.",
      cause,
    });
  }
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
    const adSource = node.getElementsByTagName("vmap:AdSource")?.[0];
    if (!adSource) {
      continue;
    }
    const adTagUriNode = adSource.getElementsByTagName("vmap:AdTagURI")?.[0];
    const adTagUri = adTagUriNode?.textContent;

    const vastAdDataNode =
      adSource.getElementsByTagName("vmap:VASTAdData")?.[0];
    const vastAdData = vastAdDataNode?.firstChild
      ? new XMLSerializer().serializeToString(vastAdDataNode.firstChild)
      : undefined;

    adBreaks.push({
      time,
      adTagUri,
      vastAdData,
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
