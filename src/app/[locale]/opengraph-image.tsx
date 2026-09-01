import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
The social card unfurled wherever a slapshot.xyz link is pasted. Generated
rather than committed as a flat image so the tagline can follow the locale of
the link that was shared — a pool invite sent in French previews in French.

`logo-mark.png` is used instead of `logo.png` (84KB against 253KB): the whole
generated route, assets included, has to fit in ImageResponse's 500KB budget.
The mark already has the brand navy baked into it, so it sits flush on a card
of the same colour rather than showing a seam.
*/

export const alt = "slapshot.xyz — free NHL pool";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BACKGROUND = "#0d1623";
const ACCENT = "#2563eb";

// Kept here rather than in the message catalogs: this runs in the Satori
// renderer, outside next-intl's request scope, and there are only two strings.
const TAGLINES: Record<string, string> = {
  en: "Create your NHL pool — draft, lineups, trades and dynasty leagues.",
  fr: "Créez votre pool de hockey — repêchage, alignements, échanges et ligues dynastie.",
};

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const logo = await readFile(join(process.cwd(), "public/logo-mark.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: BACKGROUND,
          padding: "0 90px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <img
            src={logoSrc}
            width={260}
            height={260}
            alt=""
            // The mark is a circle on a rounded-rect of the brand navy. Clipping
            // it to a circle drops those corners, which are a shade darker than
            // the card and otherwise show as a faint box around the logo.
            style={{ borderRadius: "50%" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 82,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.03em",
              }}
            >
              slapshot
              <span style={{ color: ACCENT }}>.xyz</span>
            </div>
            <div
              style={{
                fontSize: 34,
                color: "#94a3b8",
                marginTop: 18,
                lineHeight: 1.35,
                maxWidth: 640,
              }}
            >
              {TAGLINES[locale] ?? TAGLINES.en}
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
