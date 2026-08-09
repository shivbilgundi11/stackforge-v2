import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The single most valuable rule in this config. `any` is how a typed
      // API contract silently stops being typed.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored registry code — owned, but not hand-authored. Do not lint.
    // Listed file-by-file under hooks/ and lib/ because those directories also
    // hold our own code, which must stay linted.
    "components/animate-ui/**",
    "components/ui/**",
    "components/icons/**",
    "hooks/use-mobile.ts",
    "hooks/use-controlled-state.tsx",
    "hooks/use-data-state.tsx",
    "hooks/use-auto-height.tsx",
    "hooks/use-is-in-view.tsx",
    "lib/get-strict-context.tsx",
    // Generated from the FastAPI OpenAPI schema. Never hand-edited.
    "types/api.ts",
  ]),
]);

export default eslintConfig;
