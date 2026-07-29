import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "@swc/jest",
  },
  moduleNameMapper: {
    "^~/(.+)$": "<rootDir>/src/$1",
  },
};

export default config;
