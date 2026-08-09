// Fails the build when the committed types/api.ts no longer matches the
// backend schema. Drift becomes a CI failure instead of a blank panel in
// production — which is the whole point of generating the types.
import { readFileSync, existsSync, unlinkSync } from "node:fs";

const generated = ".api-types-check.ts";
const committed = "types/api.ts";
const cleanup = () => {
  for (const f of [generated, "openapi.json"]) if (existsSync(f)) unlinkSync(f);
};

if (!existsSync(generated)) {
  console.error("api:types:check — could not generate the schema. Is the backend importable?");
  cleanup();
  process.exit(1);
}

const a = readFileSync(generated, "utf8");
const b = existsSync(committed) ? readFileSync(committed, "utf8") : "";
cleanup();

if (a !== b) {
  console.error(
    "\napi:types:check — types/api.ts is stale.\n" +
      "The backend schema changed and the frontend has not absorbed it.\n" +
      "Run:  npm run api:types\n",
  );
  process.exit(1);
}
console.log("api:types:check — types/api.ts matches the backend schema.");
