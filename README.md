# Free NHL pool

[slapshot.xyz](https://slapshot.xyz)

built with next-js shadcn and rust, [See backend repository](https://github.com/jcorriveau23/backend-pool-nhl)

## Getting Started

Install the dependencies:

```bash
npm ci
```

Run the development server:

```bash
npm run dev
```

The server-side code reaches the backend through `API_URL` (defaults to `http://localhost`, expecting a reverse proxy that routes `/api-rust` to the backend). Override it when the backend lives elsewhere, e.g.:

```bash
API_URL=http://server:8000 npm run dev
```

To reach the dev server from another device on the network (a phone, a tablet),
add that host to the allowed origins — Server Actions reject requests from an
unknown origin:

```bash
EXTRA_ALLOWED_ORIGINS=192.168.0.80 npm run dev
```

## Error monitoring

Sentry is wired up but inert until a DSN is set, so a local checkout, a fork and
CI all run without one. Turn it on by setting the DSN — a write-only ingest key,
which is why it is a `NEXT_PUBLIC_` value the browser can read:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
```

Browser events are tunnelled through `/monitoring` on this origin rather than
sent to `ingest.sentry.io` directly, so ad blockers do not drop them. That path
is excluded from locale routing in `src/proxy.ts` — the two have to stay in step
if either changes.

To upload source maps, so browser stack traces are not minified, set all three
of `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT`. With any of them
missing the build skips the upload instead of failing.

### Where these are set

`NEXT_PUBLIC_*` values are **inlined into the client bundle at build time**, so
they are build args of the image, not runtime environment. Putting
`NEXT_PUBLIC_SENTRY_DSN` in the deploy repo's `docker-compose.yml` would half
work in the worst way: the server would report errors and the browser silently
would not.

| Variable | Set where | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | GitHub secret → `build-args` in `release.yaml` | Inlined into the client bundle at build |
| `SENTRY_ORG`, `SENTRY_PROJECT` | GitHub secret → `build-args` | Only used while building |
| `SENTRY_AUTH_TOKEN` | GitHub secret → `secrets:` (BuildKit mount) | A real secret; `build-args` are readable via `docker history` |
| `CSP_ENFORCE` | deploy repo `docker-compose.yml` | Read at runtime, so a restart applies it |

`CSP_ENFORCE` is the only one of the four that belongs in the deploy repo.

## Content Security Policy

`src/proxy.ts` sets a nonce-based CSP. It cannot live in the deploy repo's
Caddyfile with the other security headers: the nonce has to be minted by the
process that renders the HTML.

It ships in **report-only** mode, so a policy mistake reports rather than blanks
the page. Violations are POSTed to `/api/csp-report` and logged by the server,
so watch the container log:

```bash
docker logs -f <container> | grep "CSP violation"
```

Once the log is quiet, enforce it. This is read at runtime, so a restart is
enough — no rebuild:

```bash
CSP_ENFORCE=true
```

## Checks

These all run in CI on every pull request.

Run the linter:

```bash
npm run lint
```

Run the TypeScript type checking:

```bash
npm run typecheck
```

Run the unit tests:

```bash
npm test
```

## Build

Build the ui server:

```bash
npm run build
```

Serve the production build:

```bash
npm start
```
