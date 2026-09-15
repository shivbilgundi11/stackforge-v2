import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `scripts/capture-marketing.mjs` builds and serves the app to recapture the
  // marketing product shots, and `next build` writes to the same `.next` the
  // dev server is using. Giving the capture build its own directory is what
  // lets it run without stopping whatever is already on :3000. Nothing else
  // sets this variable.
  distDir: process.env.AIVEDA_CAPTURE === "1" ? ".next-capture" : undefined,

  // The production image copies `.next/standalone` and nothing else — no
  // `node_modules`, no source. That is the difference between a ~200 MB image
  // and a ~1.2 GB one, which on a 2 GB instance is the difference between a
  // deploy that fits and one that swaps.
  //
  // Off on Vercel, which builds the same repo and does not use the Dockerfile.
  // Vercel ends a build by running its own adapter's `onBuildComplete`, and
  // that step — not the compile, which had already finished all 71 pages —
  // is where the deploy died:
  //
  //     Running onBuildComplete from Vercel
  //     Error: ENOENT: no such file or directory, open
  //       '/vercel/path0/.next/next-server.js.nft.json'
  //
  // The two output modes are alternatives rather than layers. Vercel traces
  // the build into its own functions, so `standalone` is redundant there, and
  // Next.js treats the pairing as provisional: in `build/index.js` the adapter
  // hook is deliberately ordered ahead of the standalone step, under a comment
  // reading "in the future output: standalone might not be allowed if an
  // adapter with onBuildComplete is configured".
  //
  // Honest about the limits of that: the ENOENT was not reproduced locally.
  // The adapter only runs when Vercel injects `adapterPath`, so no local build
  // reaches the failing code at all, and a local build does emit the manifest
  // with `standalone` on. This is the supported configuration for Vercel and
  // the most likely cause, not a confirmed one. If a deploy still fails here,
  // the next thing to check is the Next.js builder version on Vercel's side.
  //
  // Keyed off Vercel's presence rather than an opt-in flag so the Dockerfile
  // needs no matching change and cannot drift out of sync with this — a build
  // that quietly stopped emitting `standalone` would fail at the image's
  // `COPY .next/standalone`, long after the commit that caused it.
  output: process.env["VERCEL"] ? undefined : "standalone",
};

export default nextConfig;
