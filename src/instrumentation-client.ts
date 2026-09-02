import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled, sentryOptions } from "@/lib/sentry-options";

/*
Browser error reporting.

Unlike the server file this imports the SDK statically, because Next needs this
module to be synchronous enough to hook navigation before the first render. The
cost is the SDK sitting in the client bundle even with no DSN set; `init` is
what is skipped, so nothing is ever sent.
*/
if (isSentryEnabled) {
  Sentry.init(sentryOptions);
}

// Lets Sentry tie a client error to the navigation that led to it, which is
// most of the value on a client-heavy app like the pool pages.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
