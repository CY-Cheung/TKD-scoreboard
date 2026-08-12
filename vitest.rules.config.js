import { defineConfig } from "vitest/config";

/** Rules suite (structure + emulator). Used by `npm run test:rules`. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/rules/**/*.{test,spec}.{js,jsx}"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
