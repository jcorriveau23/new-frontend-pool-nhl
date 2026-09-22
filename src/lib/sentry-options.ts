/*
Shared Sentry configuration, so the browser, server and edge runtimes cannot
drift apart.

Everything here is inert until a DSN is set: `isSentryEnabled` is false, the
init calls return early, and the SDK never sends a request. That is deliberate
— the app has to keep building and running in CI, in a local checkout and in a
fork, none of which have a DSN. Set NEXT_PUBLIC_SENTRY_DSN to switch it on.

The DSN is a `NEXT_PUBLIC_` value on purpose: browser errors are the reason
this exists, and the browser has to know where to send them. A DSN is a write
only ingest key, not a secret — it can submit events to the project and read
nothing back.
*/

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

export const isSentryEnabled = SENTRY_DSN.length > 0;

export const sentryOptions = {
  dsn: SENTRY_DSN,

  // Distinguishes the deployed app from a developer running the same DSN
  // locally, so a laptop experiment does not look like a production incident.
  environment: process.env.NODE_ENV,

  // Ties an event to the build that produced it. The release workflow already
  // stamps the image version, and `version.ts` surfaces it in the UI.
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Errors are the point here, and this app's traffic is small enough that
  // sampling them would just lose incidents. Performance tracing is left off:
  // it is the expensive half of the free tier's quota and answers a question
  // nobody is asking yet.
  tracesSampleRate: 0,

  // A pool draft is the moment worth debugging, and its failures are almost
  // always a sequence — a socket drop, a resync, then a bad pick. Breadcrumbs
  // carry that sequence; without them an event is a stack trace with no story.
  maxBreadcrumbs: 50,

  // Off unless explicitly asked for: pool pages show real people's names and
  // rosters, and the default would ship that markup to a third party.
  sendDefaultPii: false,
};
