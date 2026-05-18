import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  outDir: "dist",
  splitting: false,
  sourcemap: true,
  clean: true,
  // Externalize real npm packages — they must be present in node_modules at
  // runtime (Railway installs them from package.json).
  // @shipyard/* workspace packages are intentionally NOT listed here so tsup
  // bundles them inline — they ship raw TypeScript source and won't be
  // available as compiled modules on the production server.
  external: [
    "express",
    "socket.io",
    "jsonwebtoken",
    "cors",
    "dotenv",
    "pg",
    "@prisma/client",
    "@prisma/adapter-pg",
  ],
});
