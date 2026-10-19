/*
Server-side read of a goal highlight's playable sources.

The game landing hands out Brightcove video ids (`discreteClip`,
`highlightClip`) rather than media urls, so one more hop is needed to turn an
id into something a `<video>` element can play. Brightcove's playback API
answers that with a signed progressive MP4, a poster frame and the clip's
duration.

That API needs a Brightcove policy key, which this module takes from
NHL_BRIGHTCOVE_POLICY_KEY and never hardcodes. With no key set — and whenever
the key stops working, because keys do rotate — this returns null and the
player falls back to the Brightcove iframe embed, which needs no key at all.
*/

import { fetchJson } from "@/lib/server-api";

export const BRIGHTCOVE_ACCOUNT = "6415718365001";

const POLICY_KEY = process.env.NHL_BRIGHTCOVE_POLICY_KEY;

interface PlaybackSource {
  src?: string;
  container?: string;
  type?: string;
  height?: number;
}

interface PlaybackResponse {
  name?: string;
  duration?: number;
  poster?: string;
  sources?: PlaybackSource[];
}

export interface GoalClip {
  /** A progressive MP4, playable by a plain `<video>` with no extra library. */
  src: string;
  poster: string | null;
  /** Clip length in milliseconds, as Brightcove reports it. */
  duration: number | null;
  title: string | null;
}

/** Brightcove video ids are numeric; anything else is not worth a request. */
export function isClipId(value: string): boolean {
  return /^[0-9]{1,24}$/.test(value);
}

/*
The response lists HLS and DASH manifests alongside the MP4 renditions. Only
the MP4s are useful here — HLS would need a media-source library in every
browser but Safari — so the manifests are dropped and the tallest https
rendition wins.
*/
function bestMp4(sources: PlaybackSource[]): PlaybackSource | null {
  const mp4s = sources.filter(
    (source) =>
      source.container === "MP4" && source.src?.startsWith("https://"),
  );
  if (mp4s.length === 0) {
    return null;
  }
  return mp4s.reduce((best, source) =>
    (source.height ?? 0) > (best.height ?? 0) ? source : best,
  );
}

export async function getServerSideGoalClip(
  clipId: string,
): Promise<GoalClip | null> {
  if (!isClipId(clipId) || !POLICY_KEY) {
    return null;
  }

  const playback = await fetchJson<PlaybackResponse>(
    `https://edge.api.brightcove.com/playback/v1/accounts/${BRIGHTCOVE_ACCOUNT}/videos/${clipId}`,
    {
      headers: { Accept: `application/json;pk=${POLICY_KEY}` },
      // The signed media urls are good for a year, so a clip resolved once
      // does not need resolving again for the rest of the day.
      next: { revalidate: 86400 },
    },
  );

  const source = playback?.sources ? bestMp4(playback.sources) : null;
  if (!source?.src) {
    return null;
  }

  return {
    src: source.src,
    poster: playback?.poster ?? null,
    duration: playback?.duration ?? null,
    title: playback?.name ?? null,
  };
}
