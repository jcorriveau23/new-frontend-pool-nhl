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
RUN npm run build

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
