import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(scriptDir, "..");
const tarballDir = path.join(workspaceDir, "tests/publishability/tarballs");
const packageDirs = [
  "packages/core",
  "packages/express",
  "packages/fastify",
  "packages/nest",
  "packages/provider-email-resend",
  "packages/provider-sms-twilio",
  "packages/redis-store",
  "packages/starter",
  "packages/testkit"
];

await rm(tarballDir, {
  force: true,
  recursive: true
});
await mkdir(tarballDir, {
  recursive: true
});

for (const relativePackageDir of packageDirs) {
  const packageDir = path.join(workspaceDir, relativePackageDir);
  const result = spawnSync(
    "pnpm",
    ["pack", "--pack-destination", tarballDir],
    {
      cwd: packageDir,
      encoding: "utf8"
    }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to pack ${relativePackageDir}:\n${result.stderr || result.stdout}`);
  }
}

console.log(`Prepared publishability tarballs in ${tarballDir}.`);
