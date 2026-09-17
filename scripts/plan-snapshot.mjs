// Generates — and in `--check` mode, verifies — the plan snapshot the
// marketing pages fall back to when `GET /billing/plans` is unreachable.
//
// The snapshot lets /pricing and the home page show real amounts during a
// backend outage. That is only safe while it cannot go stale: a marketing page
// quoting last quarter's price is worse than one quoting none. So the file is
// generated rather than hand-written, and `--check` fails the build the moment
// it disagrees with the backend — the same arrangement types/api.ts has with
// the OpenAPI schema, for the same reason.
//
// It reads `backend/app/data/plans.py` directly rather than calling the API.
// That module is what the endpoint itself renders from, it is static data, and
// importing it needs no server and no database — so this runs on a bare
// checkout in CI, which an HTTP check could not.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../lib/marketing/plans.generated.json", import.meta.url));
const BACKEND = fileURLToPath(new URL("../../backend", import.meta.url));
const check = process.argv.includes("--check");

// The field names below are the backend's own, so a rename there surfaces as a
// changed snapshot rather than as a silent pass.
const DUMP = `
import json
from app.data import plans as p

print(json.dumps({
    "currency": p.CURRENCY,
    "plans": [
        {
            "key": s.plan.value,
            "label": s.label,
            "tagline": s.tagline,
            "monthly_minor": s.monthly_minor,
            "per_seat": s.per_seat,
            "highlights": list(s.highlights),
            "cta": s.cta,
        }
        for s in p.PLANS
    ],
}, indent=2))
`;

let generated;
try {
  generated = execFileSync("uv", ["run", "python", "-c", DUMP], {
    cwd: BACKEND,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  console.error(
    "\nplans:snapshot — could not read the backend plan configuration.\n" +
      "Is `uv` installed, and are the backend dependencies synced?\n" +
      `${error.stderr || error.message}`,
  );
  process.exit(1);
}

// Normalised so a trailing-newline or line-ending difference is never reported
// as a price change.
generated = `${JSON.stringify(JSON.parse(generated), null, 2)}\n`;

if (!check) {
  writeFileSync(OUT, generated);
  console.log(
    `plans:snapshot — wrote ${JSON.parse(generated).plans.length} plans to the snapshot.`,
  );
  process.exit(0);
}

const committed = existsSync(OUT) ? readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";

if (committed === generated) {
  console.log("plans:check — the plan snapshot matches the backend configuration.");
  process.exit(0);
}

// Field-level, because "the JSON differs" is not actionable and the thing a
// reviewer needs to see is *which price* moved.
const before = committed ? JSON.parse(committed) : { currency: null, plans: [] };
const after = JSON.parse(generated);
const lines = [];

if (before.currency !== after.currency) {
  lines.push(`currency: ${JSON.stringify(before.currency)} → ${JSON.stringify(after.currency)}`);
}

const previous = new Map(before.plans.map((plan) => [plan.key, plan]));
for (const plan of after.plans) {
  const was = previous.get(plan.key);
  if (!was) {
    lines.push(`${plan.key}: a new tier is configured on the backend`);
    continue;
  }
  previous.delete(plan.key);
  for (const field of Object.keys(plan)) {
    if (JSON.stringify(was[field]) !== JSON.stringify(plan[field])) {
      lines.push(
        `${plan.key}.${field}:\n      snapshot: ${JSON.stringify(was[field])}\n      backend:  ${JSON.stringify(plan[field])}`,
      );
    }
  }
}
for (const key of previous.keys()) {
  lines.push(`${key}: in the snapshot, no longer configured on the backend`);
}

console.error(
  "\nplans:check — the plan snapshot is stale.\n" +
    "The marketing pages would show these values during a backend outage:\n\n" +
    lines.map((line) => `  • ${line}`).join("\n") +
    "\n\nRun:  npm run plans:snapshot\n",
);
process.exit(1);
