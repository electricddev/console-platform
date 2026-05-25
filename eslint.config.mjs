import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Hyve visual language — banned primitives.
  // Rules: .claude/rules/visual-language.md
  // Spec:  docs/superpowers/specs/2026-05-26-hyve-platform-design.md §1 (rules) + §8.4 (enforcement).
  {
    files: ["app/**/*.{ts,tsx,js,jsx}", "components/**/*.{ts,tsx,js,jsx}", "lib/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/components/v2/ui/status-pill",
                "**/components/v2/ui/status-pill/**",
                "@/components/v2/ui/status-pill",
              ],
              message: "status-pill is banned. Use <Status> from components/ui/status. See .claude/rules/visual-language.md.",
            },
            {
              group: [
                "**/components/v2/ui/privacy-chip",
                "**/components/v2/ui/privacy-chip/**",
                "@/components/v2/ui/privacy-chip",
              ],
              message: "privacy-chip is banned. Use <PrivacyLevel> from components/ui/privacy-level. See .claude/rules/visual-language.md.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored/generated static assets — not our code
    "public/duckdb/**",
  ]),
]);

export default eslintConfig;
