import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `scripts/capture-marketing.mjs` builds and serves the app to recapture the
  // marketing product shots, and `next build` writes to the same `.next` the
  // dev server is using. Giving the capture build its own directory is what
  // lets it run without stopping whatever is already on :3000. Nothing else
  // sets this variable.
  distDir: process.env.STACKFORGE_CAPTURE === "1" ? ".next-capture" : undefined,
};

export default nextConfig;
