import type { Metadata } from "next";
import { notFound } from "next/navigation";

/*
 * This page can be rendered after a route has already matched, so the
 * response may still have a 200 status when streamed. Explicitly adding
 * noindex prevents these soft 404 pages from being indexed.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CatchAllNotFound() {
  notFound();
}
