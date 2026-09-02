import type { Instrumentation } from "next";

import { isSentryEnabled, sentryOptions } from "@/lib/sentry-options";

/*
Server and edge runtime error reporting.

Next calls `register()` once per runtime at startup, and `onRequestError` for
every error it catches while rendering on the server — which is the class of
failure that is currently invisible in production, because it never reaches a
browser console.

The SDK is imported dynamically and only when a DSN is configured, so a build
without one does not pull it into the server bundle at all.
*/
export async function register() {
  if (!isSentryEnabled) {
    return;
  }

  // Both runtimes use the same entry point; the SDK picks the right transport.
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init(sentryOptions);
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  ...args
) => {
  if (!isSentryEnabled) {
    return;
  }

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
