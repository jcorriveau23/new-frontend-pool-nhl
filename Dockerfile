# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Build the Next.js application
ARG NEXT_PUBLIC_HANKO_API_URL
ENV NEXT_PUBLIC_HANKO_API_URL=${NEXT_PUBLIC_HANKO_API_URL}
# The release tag, shown in the footer next to the backend's own version.
# package.json is pinned at 0.1.0 and never bumped — releases are cut from git
# tags — so the tag has to come in from the build rather than be read from the
# source tree. Left unset, the app reports "dev".
ARG NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}

# The Sentry DSN is a build arg for the same reason as the Hanko URL: NEXT_PUBLIC_*
# is inlined into the client bundle here, so setting it at runtime in the deploy
# repo would only ever reach the server half and browser errors would silently
# go unreported. A DSN is a write-only ingest key that ships in the client
# bundle regardless, so it is not a secret. Left unset, Sentry stays inert.
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}

# Source map upload, so browser stack traces are not minified. Org and project
# are plain identifiers; the auth token is a real secret and so comes in through
# a BuildKit secret mount instead of an ARG — ARG values are recorded in the
# image metadata and would be readable with `docker history`.
ARG SENTRY_ORG
ENV SENTRY_ORG=${SENTRY_ORG}
ARG SENTRY_PROJECT
ENV SENTRY_PROJECT=${SENTRY_PROJECT}

# The secret is optional: with none mounted the token is empty, next.config.mjs
# sees an incomplete set and skips the upload rather than failing the build.
RUN --mount=type=secret,id=sentry_auth_token \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" \
    npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

# `output: "standalone"` traces the modules the server actually needs into
# .next/standalone, so the runtime stage needs no npm install at all. The
# static assets and public/ are not included by the trace and are copied
# alongside, where the generated server.js picks them up.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Drop root: the server only ever reads its own bundle.
USER node

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]
