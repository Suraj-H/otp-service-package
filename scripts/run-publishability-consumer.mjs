import path from "node:path";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const mode = process.argv[2];

if (mode !== "runtime" && mode !== "types") {
  throw new Error('Usage: node scripts/run-publishability-consumer.mjs <runtime|types>');
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(scriptDir, "..");
const consumerDir = path.join(workspaceDir, "tests/publishability/consumer");
const npmCacheDir = path.join(workspaceDir, ".tmp/npm-cache");

await cleanConsumerInstallState();

runCommand("npm", ["install", "--no-package-lock"], {
  cwd: consumerDir,
  env: createNpmEnv()
});

if (mode === "runtime") {
  runCommand("node", ["runtime-check.mjs"], {
    cwd: consumerDir,
    env: process.env
  });
} else {
  runCommand("npm", ["exec", "--", "tsc", "-p", "tsconfig.json", "--noEmit"], {
    cwd: consumerDir,
    env: createNpmEnv()
  });
}

function createNpmEnv() {
  const env = { ...process.env };

  for (const key of Object.keys(env)) {
    if (key.toLowerCase().startsWith("npm_")) {
      delete env[key];
    }
  }

  env.NPM_CONFIG_CACHE = npmCacheDir;
  return env;
}

async function cleanConsumerInstallState() {
  await rm(path.join(consumerDir, "node_modules"), {
    force: true,
    recursive: true
  });
  await rm(path.join(consumerDir, "package-lock.json"), {
    force: true
  });
}

function runCommand(command, args, options) {
  const result = spawnSync(command, args, {
    ...options,
    encoding: "utf8",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}
