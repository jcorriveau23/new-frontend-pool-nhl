import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    // Components need a DOM; the pure modules under src/lib do not care.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // `env-variables.ts` throws at import time without this, which used to make
    // every context module unimportable under vitest. CI passes the same
    // placeholder to `next build`.
    env: {
      NEXT_PUBLIC_HANKO_API_URL: "http://localhost/hanko",
    },
    coverage: {
      provider: "v8",
      // Console summary, an lcov file for CI and other tools, and a browsable
      // report at coverage/index.html for `npm run test:coverage` locally.
      reporter: ["text-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      // Files no test imports still count, otherwise deleting the last test of
      // a module would make coverage go up.
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        // Vendored shadcn primitives: upstream code the app does not own.
        "src/components/ui/**",
        // Type and enum declarations, and the thin fetch wrappers around the
        // NHL api and the backend — nothing to exercise without a network.
        "src/data/nhl/**",
        "src/data/**/model.ts",
        "src/data/**/request*.ts",
        "src/data/**/response.ts",
        "src/lib/server-data/**",
        // Framework entry points: routing, metadata, layouts and the proxy.
        "src/app/**/{layout,loading,error,not-found,page,route,sitemap,robots,manifest,opengraph-image}.{ts,tsx}",
        "src/i18n/**",
        "src/proxy.ts",
      ],
      /*
      Thresholds only where they mean something: the pure modules that hold the
      pool's rules. They sit just under today's numbers, so they catch a
      regression without failing on a percentage point of drift. The rest of
      `src` is measured and reported, not gated — its components need a DOM
      environment the suite does not set up.
      */
      thresholds: {
        "src/lib/*.ts": {
          statements: 85,
          branches: 85,
          functions: 84,
          lines: 85,
        },
        "src/app/**/*-calculation.ts": {
          statements: 75,
          branches: 66,
          functions: 64,
          lines: 75,
        },
        // The four screens and the two contexts that carry a draft. Set under
        // where they stand so a regression trips rather than drift.
        "src/components/{player-table,starting-roster,create-trade-dialog}.tsx":
          {
            statements: 68,
            branches: 68,
            functions: 65,
            lines: 68,
          },
        "src/context/socket-context.tsx": {
          statements: 80,
          branches: 60,
          functions: 64,
          lines: 80,
        },
      },
    },
  },
});
