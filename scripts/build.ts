import { $ } from "bun";

await $`rm -rf dist`;

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "browser",
  format: "esm",
  packages: "external",
  minify: false,
  splitting: false,
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

await $`cp src/styles/tollbooth.css dist/tollbooth.css`;
await $`tsc --project tsconfig.build.json`;

console.log("Build complete!");
