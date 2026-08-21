"use client"; // Error boundaries must be Client Components.

import ErrorFallback from "@/components/error-fallback";

/*
Catches every uncaught render error below the locale layout, so a throw in a
page or a context provider shows a recoverable message instead of a blank
screen. Errors thrown by the locale layout itself bubble up to `global-error`.

This renders inside the locale layout, so the next-intl provider is available
and the message is translated.
*/
export default function LocaleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorFallback error={error} retry={retry} />;
}
