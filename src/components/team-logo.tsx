"use client";

import Image from "next/image";
import team_info from "@/lib/teams";

interface Props {
  teamId?: number | null;
  src?: string;
  alt?: string;
  width: number;
  height: number;
}

export function TeamLogo(props: Props) {
  const src =
    props.src ?? (props.teamId ? team_info[props.teamId]?.logo : null);

  if (!src) {
    return null;
  }

  return (
    <Image
      width={props.width}
      height={props.height}
      // Tailwind preflight sets `img { height: auto }`, which resizes these
      // 3:2 NHL SVGs and triggers Next.js's aspect-ratio warning. Pinning the
      // box inline overrides it; the SVG letterboxes inside.
      style={{ width: props.width, height: props.height }}
      alt={props.alt ?? "team"}
      src={src}
    />
  );
}
