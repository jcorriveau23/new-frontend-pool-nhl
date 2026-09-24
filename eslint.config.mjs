import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

// `next lint` was removed in Next.js 16; eslint runs through its own CLI.
// Since eslint-config-next 16 the shareable configs are native flat configs, so
// they are spread in directly rather than through FlatCompat.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Last, so it switches off the rules that would fight prettier. Formatting is
  // prettier's job (`npm run format`), and CI checks it separately.
  prettier,
  {
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      // New in eslint-plugin-react-hooks 7 (the React Compiler rules), which
      // eslint-config-next 16 turns on as errors. They flag patterns that
      // predate the upgrade across ~25 files, so they warn until that code is
      // migrated instead of failing CI on unchanged code.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
