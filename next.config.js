/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  /** Standalone output for Docker — produces a minimal self-contained build */
  output: "standalone",

  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
};

export default config;
