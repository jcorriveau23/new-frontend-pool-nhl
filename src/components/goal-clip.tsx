"use client";

/*
Inline playback of a goal highlight.

Nothing is loaded until the goal is clicked: the card renders a play button,
and only then does it ask /api/goal-clip to turn the Brightcove video id from
the game landing into a progressive MP4 it can hand to a plain `<video>`.

When that resolve fails — no policy key configured, a rotated key, a clip
Brightcove will not serve — it falls back to Brightcove's own iframe player,
which needs no key. Both paths keep the goal on the page rather than sending
the pooler to nhl.com.
*/

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const BRIGHTCOVE_ACCOUNT = "6415718365001";
const BRIGHTCOVE_PLAYER = "D3UCGynRWU_default";

function embedUrl(clipId: number): string {
  return `https://players.brightcove.net/${BRIGHTCOVE_ACCOUNT}/${BRIGHTCOVE_PLAYER}/index.html?videoId=${clipId}&autoplay=true`;
}

interface Clip {
  src: string;
  poster: string | null;
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "native"; clip: Clip }
  | { status: "embed" };

interface Props {
  clipId: number;
  /** Shown under the player so the full highlight stays one click away. */
  sharingUrl?: string;
}

export default function GoalClip(props: Props) {
  const t = useTranslations();
  const [state, setState] = React.useState<State>({ status: "idle" });

  const play = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/goal-clip/${props.clipId}`);
      if (!res.ok) {
        setState({ status: "embed" });
        return;
      }
      const clip: Clip = await res.json();
      setState({ status: "native", clip });
    } catch {
      setState({ status: "embed" });
    }
  };

  if (state.status === "idle" || state.status === "loading") {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={state.status === "loading"}
        onClick={play}
      >
        {state.status === "loading" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Play />
        )}
        {t("WatchGoal")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <AspectRatio
        ratio={16 / 9}
        className="overflow-hidden rounded-md bg-black"
      >
        {state.status === "native" ? (
          <video
            className="size-full"
            src={state.clip.src}
            poster={state.clip.poster ?? undefined}
            controls
            autoPlay
            playsInline
            preload="metadata"
          />
        ) : (
          <iframe
            className="size-full"
            src={embedUrl(props.clipId)}
            title={t("WatchGoal")}
            allow="encrypted-media"
            allowFullScreen
          />
        )}
      </AspectRatio>
      {props.sharingUrl ? (
        <a
          href={props.sharingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary self-end text-xs"
        >
          {t("WatchOnNhl")}
        </a>
      ) : null}
    </div>
  );
}
