import ky, { isHTTPError, isTimeoutError } from "ky";
import { ApiError } from "../error";
import { filterMainPlaylist } from "../filter";
import type { MainPlaylist, MediaPlaylist } from "../parser/hls";
import {
  parseMainPlaylist,
  parseMediaPlaylist,
  stringifyMainPlaylist,
  stringifyMediaPlaylist,
} from "../parser/hls";
import { getVMAP } from "../parser/vmap";
import type { AppContext } from "../routes";
import { mediaPayloadSchema } from "../schema";
import type { Asset, Interstitial, MediaPayload, Session } from "../types";
import { getUrlCommonPrefix, replaceUrlParams } from "../utils/url";
import { addInterstitialDateRanges } from "./interstitials";
import { mergeInterstitials, toDateTime, updateSession } from "./session";

type ProcessMainPlaylistParams = {
  session: Session;
};

export async function processMainPlaylist(
  c: AppContext,
  { session }: ProcessMainPlaylistParams,
) {
  const { url } = session;
  await updateSessionOnMainPlaylist(c, session);

  let playlistText: string;
  try {
    playlistText = await ky
      .get(url, {
        headers: {
          "x-forwarded-for":
            c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for"),
        },
      })
      .text();
  } catch (cause) {
    let message = "Could not fetch the origin main playlist.";
    if (isHTTPError(cause)) {
      message = `Could not fetch the origin main playlist: the origin returned HTTP ${cause.response.status}.`;
    } else if (isTimeoutError(cause)) {
      message =
        "Could not fetch the origin main playlist: the request timed out.";
    }
    throw new ApiError({ code: "FETCH_ORIGIN_FAILED", message, cause });
  }

  let playlist: MainPlaylist;
  try {
    playlist = parseMainPlaylist(playlistText);
  } catch (cause) {
    throw new ApiError({
      code: "INVALID_ORIGIN_PLAYLIST",
      message: "The origin main playlist is invalid or unsupported.",
      cause,
    });
  }
  if (!playlist.variants.length) {
    throw new ApiError({
      code: "INVALID_ORIGIN_PLAYLIST",
      message: "The origin main playlist contains no media variants.",
    });
  }

  playlist.comments = [
    `Generated with hlspresso, at ${session.startTime.toISO()}`,
  ];

  if (session.filter) {
    filterMainPlaylist(playlist, session.filter);
  }

  rewriteMediaUrlsInMain(playlist);

  return stringifyMainPlaylist(playlist);
}

type ProcessMediaPlaylistParams = {
  session: Session;
  payload: MediaPayload;
};

export async function processMediaPlaylist(
  c: AppContext,
  { session, payload }: ProcessMediaPlaylistParams,
) {
  let origUrl: URL;
  try {
    origUrl = new URL(payload.path, session.url);
  } catch (cause) {
    throw new ApiError({
      code: "INVALID_REQUEST",
      message: "The media playlist path is not a valid URL.",
      details: [{ field: "payload.path", message: "Must be a valid URL." }],
      cause,
    });
  }

  let playlistText: string;
  try {
    playlistText = await ky
      .get(origUrl, {
        headers: {
          "x-forwarded-for":
            c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for"),
        },
      })
      .text();
  } catch (cause) {
    let message = "Could not fetch the origin media playlist.";
    if (isHTTPError(cause)) {
      message = `Could not fetch the origin media playlist: the origin returned HTTP ${cause.response.status}.`;
    } else if (isTimeoutError(cause)) {
      message =
        "Could not fetch the origin media playlist: the request timed out.";
    }
    throw new ApiError({ code: "FETCH_ORIGIN_FAILED", message, cause });
  }

  let playlist: MediaPlaylist;
  try {
    playlist = parseMediaPlaylist(playlistText);
  } catch (cause) {
    throw new ApiError({
      code: "INVALID_ORIGIN_PLAYLIST",
      message: "The origin media playlist is invalid or unsupported.",
      cause,
    });
  }

  const isLive = !playlist.endlist;

  if (!isLive) {
    addSessionStartTimeAsPDT(session, playlist);
  }

  try {
    rewriteSegmentUrlsInMedia(playlist, origUrl);
  } catch (cause) {
    throw new ApiError({
      code: "INVALID_ORIGIN_PLAYLIST",
      message: "The origin media playlist contains an invalid URI.",
      cause,
    });
  }

  if (payload.type === "VIDEO") {
    addInterstitialDateRanges({
      session,
      playlist,
      isLive,
    });
  }

  return stringifyMediaPlaylist(playlist);
}

async function updateSessionOnMainPlaylist(c: AppContext, session: Session) {
  let storeSession = false;

  // If we have a vmap config but no result yet, we'll resolve it.
  if (session.vmap) {
    c.var.logger.info(session.vmap, "Requesting VMAP");
    const vmap = await getVMAP({
      url: replaceUrlParams(session.vmap.url, c.req, session.params),
    });

    // Delete the VMAP url. We don't need to parse it again.
    session.vmap = undefined;

    const interstitials: Interstitial[] = [];
    // Add each adBreak to the list of assets.
    for (const adBreak of vmap.adBreaks) {
      const assets: Asset[] = [];
      if (adBreak.adTagUri) {
        assets.push({
          type: "VAST",
          url: adBreak.adTagUri,
        });
      }
      if (adBreak.vastAdData) {
        assets.push({
          type: "VASTDATA",
          data: adBreak.vastAdData,
        });
      }
      if (!assets.length) {
        continue;
      }
      interstitials.push({
        dateTime: toDateTime(session.startTime, adBreak.time),
        assets,
      });
    }

    if (interstitials.length) {
      c.var.logger.info(
        interstitials,
        "Created a new set of interstitials from VMAP",
      );
      mergeInterstitials(session.interstitials, interstitials);
    }

    storeSession = true;
  }

  if (storeSession) {
    await updateSession(c, session);
  }
}
export async function getDuration(mainUrl: string) {
  let mainText: string;
  try {
    mainText = await ky.get(mainUrl).text();
  } catch (cause) {
    let message = "Could not fetch the static asset main playlist.";
    if (isHTTPError(cause)) {
      message = `Could not fetch the static asset main playlist: the server returned HTTP ${cause.response.status}.`;
    } else if (isTimeoutError(cause)) {
      message =
        "Could not fetch the static asset main playlist: the request timed out.";
    }
    throw new ApiError({ code: "FETCH_STATIC_ASSET_FAILED", message, cause });
  }

  let main: MainPlaylist;
  try {
    main = parseMainPlaylist(mainText);
  } catch (cause) {
    throw new ApiError({
      code: "INVALID_STATIC_ASSET_PLAYLIST",
      message: "The static asset main playlist is invalid or unsupported.",
      cause,
    });
  }

  const variant = main.variants[0];
  if (!variant) {
    throw new ApiError({
      code: "INVALID_STATIC_ASSET_PLAYLIST",
      message: "The static asset main playlist contains no media variants.",
    });
  }

  // Resolve and parse the first media playlist.
  let mediaUrl: URL;
  try {
    mediaUrl = new URL(variant.uri, mainUrl);
  } catch (cause) {
    throw new ApiError({
      code: "INVALID_STATIC_ASSET_PLAYLIST",
      message: "The static asset main playlist contains an invalid media URI.",
      cause,
    });
  }

  let mediaText: string;
  try {
    mediaText = await ky.get(mediaUrl).text();
  } catch (cause) {
    let message = "Could not fetch the static asset media playlist.";
    if (isHTTPError(cause)) {
      message = `Could not fetch the static asset media playlist: the server returned HTTP ${cause.response.status}.`;
    } else if (isTimeoutError(cause)) {
      message =
        "Could not fetch the static asset media playlist: the request timed out.";
    }
    throw new ApiError({ code: "FETCH_STATIC_ASSET_FAILED", message, cause });
  }

  let media: MediaPlaylist;
  try {
    media = parseMediaPlaylist(mediaText);
  } catch (cause) {
    throw new ApiError({
      code: "INVALID_STATIC_ASSET_PLAYLIST",
      message: "The static asset media playlist is invalid or unsupported.",
      cause,
    });
  }

  // Sum each segment duration to get a sense of what the total duration
  // of the playlist may be.
  return media.segments.reduce((acc, segment) => {
    return acc + segment.duration;
  }, 0);
}

function rewriteMediaUrlsInMain(playlist: MainPlaylist) {
  let index = 0;
  for (const variant of playlist.variants) {
    variant.uri = `media/${mediaPayloadSchema.encode({
      type: "VIDEO",
      path: variant.uri,
    })}/video_${++index}.m3u8`;
  }
  for (const media of playlist.medias) {
    if (media.type === "AUDIO") {
      media.uri = `media/${mediaPayloadSchema.encode({
        type: "AUDIO",
        path: media.uri,
      })}/video_${++index}.m3u8`;
    }
    if (media.type === "SUBTITLES") {
      media.uri = `media/${mediaPayloadSchema.encode({
        type: "SUBTITLES",
        path: media.uri,
      })}/video_${++index}.m3u8`;
    }
  }
}

function rewriteSegmentUrlsInMedia(playlist: MediaPlaylist, origUrl: URL) {
  const lookupMap = new Map<{ uri: string }, string>();

  // Collect all rewritable parts. These need to point
  // to the original URL.
  for (const segment of playlist.segments) {
    const origSegmentUrl = new URL(segment.uri, origUrl).toString();
    lookupMap.set(segment, origSegmentUrl);
    if (segment.map) {
      const origMapUrl = new URL(segment.map.uri, origUrl).toString();
      lookupMap.set(segment.map, origMapUrl);
    }
  }

  const baseUrl = getUrlCommonPrefix(Array.from(lookupMap.values()));

  if (baseUrl) {
    playlist.defines.push({
      name: "ORIG_BASE_URL",
      value: baseUrl,
    });
  }

  for (const [item, url] of lookupMap.entries()) {
    if (baseUrl) {
      // When we have a baseUrl, we can subtract that as we have it defined
      // in an X-DEFINE.
      item.uri = `{$ORIG_BASE_URL}${url.substring(baseUrl.length)}`;
    } else {
      item.uri = url;
    }
  }
}

function addSessionStartTimeAsPDT(session: Session, playlist: MediaPlaylist) {
  const firstSegment = playlist.segments[0];
  // Add our own PDT when VOD, we'll use this to insert
  // date ranges relative to the start of the session.
  if (!firstSegment) {
    throw new ApiError({
      code: "INVALID_ORIGIN_PLAYLIST",
      message: "The origin media playlist contains no media segments.",
    });
  }
  firstSegment.programDateTime = session.startTime;
}
