import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(rootDir, "..");

const packageExpectations = [
  {
    description: "Framework-agnostic OTP domain logic for Node.js services.",
    name: "@otp-service/core",
    relativeDir: "packages/core"
  },
  {
    description: "Express route helpers for OTP generate and verify flows.",
    name: "@otp-service/express",
    relativeDir: "packages/express"
  },
  {
    description: "Fastify route helpers for OTP generate and verify flows.",
    name: "@otp-service/fastify",
    relativeDir: "packages/fastify"
  },
  {
    description: "Nest module and controller helpers for OTP flows.",
    name: "@otp-service/nest",
    relativeDir: "packages/nest"
  },
  {
    description: "Resend email delivery adapter for OTP challenges.",
    name: "@otp-service/provider-email-resend",
    relativeDir: "packages/provider-email-resend"
  },
  {
    description: "Twilio SMS delivery adapter for OTP challenges.",
    name: "@otp-service/provider-sms-twilio",
    relativeDir: "packages/provider-sms-twilio"
  },
  {
    description: "Redis-backed challenge state storage for OTP services.",
    name: "@otp-service/redis-store",
    relativeDir: "packages/redis-store"
  },
  {
    description: "Thin starter composition helpers for the common OTP adoption path.",
    name: "@otp-service/starter",
    relativeDir: "packages/starter"
  },
  {
    description: "Test doubles and deterministic fixtures for OTP package testing.",
    name: "@otp-service/testkit",
    relativeDir: "packages/testkit"
  }
];

for (const packageExpectation of packageExpectations) {
  const packageDir = path.join(workspaceDir, packageExpectation.relativeDir);
  const packageJsonPath = path.join(packageDir, "package.json");
  const distJsPath = path.join(packageDir, "dist/index.js");
  const distTypesPath = path.join(packageDir, "dist/index.d.ts");

  await Promise.all([access(distJsPath), access(distTypesPath)]);

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  assertPackageMetadata(packageExpectation, packageJson);
}

console.log(`Verified package metadata and built entry files for ${packageExpectations.length} packages.`);

function assertPackageMetadata(packageExpectation, packageJson) {
  if (packageJson.name !== packageExpectation.name) {
    throw new Error(`Unexpected package name in ${packageExpectation.relativeDir}.`);
  }

  if (packageJson.description !== packageExpectation.description) {
    throw new Error(`${packageExpectation.name} description is missing or inconsistent.`);
  }

  if (packageJson.license !== "MIT") {
    throw new Error(`${packageExpectation.name} must declare license MIT for public packages.`);
  }

  if (packageJson.engines?.node !== ">=22.0.0") {
    throw new Error(`${packageExpectation.name} must declare the shared Node engine policy.`);
  }

  if (packageJson.publishConfig?.access !== "public") {
    throw new Error(`${packageExpectation.name} must set publishConfig.access to public.`);
  }

  if (packageJson.type !== "module") {
    throw new Error(`${packageExpectation.name} must remain ESM-only.`);
  }

  if (packageJson.sideEffects !== false) {
    throw new Error(`${packageExpectation.name} must declare sideEffects false.`);
  }

  const expectedFiles = ["dist", "README.md"];
  if (JSON.stringify(packageJson.files) !== JSON.stringify(expectedFiles)) {
    throw new Error(
      `${packageExpectation.name} files[] must be ${JSON.stringify(expectedFiles)} (dist + npm README).`
    );
  }

  if (packageJson.main !== "./dist/index.js" || packageJson.types !== "./dist/index.d.ts") {
    throw new Error(`${packageExpectation.name} main/types entries must point at dist/index.*.`);
  }

  const exportsRoot = packageJson.exports?.["."];
  if (
    exportsRoot?.import !== "./dist/index.js" ||
    exportsRoot?.types !== "./dist/index.d.ts"
  ) {
    throw new Error(`${packageExpectation.name} exports map must explicitly expose dist/index.js and dist/index.d.ts.`);
  }
}
