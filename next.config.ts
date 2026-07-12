import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // We explicitly disable cacheOnNavigation as requested: "Keep cacheOnNavigation:false"
  cacheOnNavigation: false,
});

const nextConfig: NextConfig = {
};

export default withSerwist(nextConfig);
