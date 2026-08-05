import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/lib/production.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Local media is intentionally served by ShotDeck rather than optimized by a
  // remote image service. Keep the rule enabled everywhere else.
  {
    files: [
      "src/components/ProjectAiWorkspace.tsx",
      "src/components/ReviewBoard.tsx",
      "src/app/projects/*/shots/*/page.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // The production dashboard's interval intentionally polls the current server
  // snapshot. The callback only posts a fixed action and refreshes route data.
  {
    files: ["src/components/ProductionProjectPanel.tsx"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
