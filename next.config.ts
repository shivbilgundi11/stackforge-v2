import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `scripts/capture-marketing.mjs` builds and serves the app to recapture the
  // marketing product shots, and `next build` writes to the same `.next` the
  // dev server is using. Giving the capture build its own directory is what
  // lets it run without stopping whatever is already on :3000. Nothing else
  // sets this variable.
  distDir: process.env.STACKFORGE_CAPTURE === "1" ? ".next-capture" : undefined,

  // The production image copies `.next/standalone` and nothing else — no
  // `node_modules`, no source. That is the difference between a ~200 MB image
  // and a ~1.2 GB one, which on a 2 GB instance is the difference between a
  // deploy that fits and one that swaps.
  output: "standalone",
};

export default nextConfig;
