#!/usr/bin/env node
// Syncs root and packages/* manifests: repository, bugs, homepage from `git remote get-url origin`.
// Supports ssh and https GitHub URLs. Run: `node scripts/sync-repository-url.mjs`
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function getOriginUrl() {
  try {
    return execSync("git remote get-url origin", {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function parseGithubRepo(url) {
  if (!url) {
    return null;
  }
  const ssh = /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i;
  const https = /^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/i;
  let match = url.match(ssh);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  match = url.match(https);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

function applyMetadata(pkgPath, owner, repo, packageSubpath) {
  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw);
  const base = `https://github.com/${owner}/${repo}`;
  pkg.repository = { type: "git", url: `git+${base}.git` };
  pkg.bugs = { url: `${base}/issues` };
  pkg.homepage = packageSubpath
    ? `${base}/tree/main/${packageSubpath}#readme`
    : `${base}#readme`;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

const origin = getOriginUrl();
const parsed = parseGithubRepo(origin);

if (!parsed) {
  console.error(
    "Could not parse GitHub owner/repo from `git remote get-url origin`.\n" +
      `Got: ${origin || "(no origin)"}\n` +
      "Expected ssh (git@github.com:org/repo.git) or https (https://github.com/org/repo.git)."
  );
  process.exit(1);
}

const { owner, repo } = parsed;
applyMetadata(path.join(rootDir, "package.json"), owner, repo, null);

const packagesDir = path.join(rootDir, "packages");
for (const name of readdirSync(packagesDir)) {
  const pkgPath = path.join(packagesDir, name, "package.json");
  try {
    readFileSync(pkgPath, "utf8");
  } catch {
    continue;
  }
  applyMetadata(pkgPath, owner, repo, `packages/${name}`);
}

console.log(`Updated repository metadata for github.com/${owner}/${repo}`);
