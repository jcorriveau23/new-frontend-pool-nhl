import { FlatCompat } from "@eslint/eslintrc";

// `next lint` was removed in Next.js 16; eslint runs through its own CLI with
// this flat config, which reuses the shareable Next.js configs.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
