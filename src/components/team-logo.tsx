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

// NHL logos come in two variants: `_light` is drawn for light backgrounds and
// `_dark` for dark ones (e.g. Tampa Bay is navy on light, white on dark).
// Returns both, or null when the URL doesn't follow that naming.
function themedVariants(src: string) {
  const match = src.match(/^(.*)_(light|dark)\.svg$/);
  if (!match) {
    return null;
  }
  return { light: `${match[1]}_light.svg`, dark: `${match[1]}_dark.svg` };
}

export function TeamLogo(props: Props) {
  const src =
    props.src ?? (props.teamId ? team_info[props.teamId]?.logo : null);

  if (!src) {
    return null;
  }

  const imageProps = {
    width: props.width,
    height: props.height,
    // Tailwind preflight sets `img { height: auto }`, which resizes these
    // 3:2 NHL SVGs and triggers Next.js's aspect-ratio warning. Pinning the
    // box inline overrides it; the SVG letterboxes inside.
    style: { width: props.width, height: props.height },
  };
  const alt = props.alt ?? "team";

  const variants = themedVariants(src);
  if (!variants) {
    return <Image {...imageProps} alt={alt} src={src} />;
  }

  // Both are rendered and toggled with CSS rather than reading the theme in
  // JS, so the server markup matches the client and nothing flashes. Lazy
  // images hidden with display:none are not fetched.
  return (
    <>
      <Image
        {...imageProps}
        alt={alt}
        src={variants.light}
        className="dark:hidden"
      />
      <Image
        {...imageProps}
        alt={alt}
        src={variants.dark}
        className="hidden dark:block"
      />
    </>
  );
}
