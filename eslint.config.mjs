import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // These use **/ prefixes so they also match nested copies of these folders -
  // for example a leftover git worktree under .claude/worktrees/<name>/.next,
  // which otherwise gets linted as if it were hand-written source.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    // Anything under a nested checkout (git worktrees, etc.) should never be linted
    // as this project's own source.
    ".claude/**",
    "**/node_modules/**",
  ]),
]);

export default eslintConfig;
