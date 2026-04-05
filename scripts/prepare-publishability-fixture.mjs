import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

const consumerPackagePath = path.join(workspaceDir, "tests/publishability/consumer/package.json");
const consumerJson = JSON.parse(await readFile(consumerPackagePath, "utf8"));

for (const relativePackageDir of packageDirs) {
  const manifestPath = path.join(workspaceDir, relativePackageDir, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const { name, version } = manifest;
  if (!name?.startsWith("@otp-service/")) {
    throw new Error(`Unexpected package name in ${relativePackageDir}`);
  }

  const shortName = name.slice("@otp-service/".length);
  const tarballFile = `otp-service-${shortName}-${version}.tgz`;
  const depKey = name;
  if (consumerJson.dependencies[depKey] !== undefined) {
    consumerJson.dependencies[depKey] = `file:../tarballs/${tarballFile}`;
  }
}

await writeFile(consumerPackagePath, `${JSON.stringify(consumerJson, null, 2)}\n`, "utf8");

console.log(`Prepared publishability tarballs in ${tarballDir}.`);
