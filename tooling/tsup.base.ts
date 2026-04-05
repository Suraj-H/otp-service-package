import { defineConfig, type Options } from "tsup";

export function createPackageBuildConfig(overrides: Options = {}) {
  return defineConfig({
    clean: true,
    dts: true,
    entry: ["src/index.ts"],
    format: ["esm"],
    sourcemap: true,
    splitting: false,
    target: "node22",
    treeshake: true,
    ...overrides
  });
}
