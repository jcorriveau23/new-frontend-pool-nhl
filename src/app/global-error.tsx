"use client"; // Error boundaries must be Client Components.

import * as React from "react";
import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled } from "@/lib/sentry-options";

/*
Last-resort boundary for errors thrown by the root layout itself (failed font
load, a provider throwing on mount, a missing environment variable). It
replaces the root layout when active, so it renders its own <html>/<body> and
cannot rely on globals.css, the theme provider or next-intl: every style is
inline and the copy is picked from the URL locale rather than the provider.
*/

const COPY = {
  en: {
    title: "Something went wrong",
    description:
      "The application could not start. The problem is usually temporary, retrying often resolves it.",
    retry: "Retry",
    reference: "Reference:",
  },
  fr: {
    title: "Une erreur est survenue",
    description:
      "L'application n'a pas pu démarrer. Le problème est généralement temporaire, réessayer suffit souvent à le régler.",
    retry: "Réessayer",
    reference: "Référence :",
  },
} as const;

// The next-intl provider is unavailable here, so the locale comes from the
// first path segment the proxy produced (/en/... or /fr/...).
function localeFromPath(): "en" | "fr" {
  if (typeof window === "undefined") {
    return "en";
  }
  return window.location.pathname.startsWith("/fr") ? "fr" : "en";
}

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = localeFromPath();
  const copy = COPY[locale];

  // The failure that lands here took out the root layout, so it never reached
  // `onRequestError` on the server and no other boundary will report it.
  React.useEffect(() => {
    if (isSentryEnabled) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    // global-error must include html and body tags.
    // `lang` follows the path for the same reason the copy does: this boundary
    // renders instead of the root layout, so nothing else sets it.
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "Canvas",
          color: "CanvasText",
        }}
      >
        <title>{copy.title}</title>
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
            {copy.title}
          </h1>
          <p style={{ marginTop: "0.75rem", lineHeight: 1.5, opacity: 0.8 }}>
            {copy.description}
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: "0.5rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                opacity: 0.65,
              }}
            >
              {copy.reference} {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "1.25rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid currentColor",
              background: "transparent",
              color: "inherit",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            {copy.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
