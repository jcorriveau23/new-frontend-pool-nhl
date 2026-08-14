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
