import { notFound } from "next/navigation";

/*
Catch-all for unmatched paths under a locale.

Without it, /en/does-not-exist is resolved as a 404 above the locale segment
and falls back to the built-in Next.js error page, which is untranslated and
loses the app chrome. Calling notFound() here routes it to
`[locale]/not-found.tsx` instead. Concrete routes take precedence over a
catch-all, so this never shadows a real page.
*/
export default function CatchAllNotFound() {
  notFound();
}
