import type { Metadata } from "next";
import { notFound } from "next/navigation";

/*
Catch-all for unmatched paths under a locale.

Without it, /en/does-not-exist is resolved as a 404 above the locale segment
and falls back to the built-in Next.js error page, which is untranslated and
loses the app chrome. Calling notFound() here routes it to
`[locale]/not-found.tsx` instead. Concrete routes take precedence over a
catch-all, so this never shadows a real page.
*/

/*
The response is streamed, so it carries a 200 no matter what this renders:
once the headers are out the status cannot be changed. Next's documented
compensation for that is a `noindex` tag in the streamed HTML, but it is not
emitted here — the 404 is raised inside a route that matched rather than by the
router failing to match — so an unmatched URL would otherwise be an indexable
soft 404. Declaring it explicitly is what keeps these out of search results.
*/
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CatchAllNotFound() {
  notFound();
}
