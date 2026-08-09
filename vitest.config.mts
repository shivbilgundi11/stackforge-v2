import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Two environments, split by extension.
 *
 * The spec and coercion suites are pure functions and run in `node`, which is
 * meaningfully faster and keeps them honest — a registry test that quietly
 * started depending on `window` would be testing something other than the
 * registry. Component suites get jsdom.
 */
export default defineConfig({
  plugins: [react()],
  // Native since Vite 8; the `vite-tsconfig-paths` plugin is no longer needed
  // to resolve the `@/*` alias.
  resolve: { tsconfigPaths: true },
  test: {
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: ["node_modules/**", ".next/**", "e2e/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          exclude: ["node_modules/**", ".next/**", "e2e/**"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
