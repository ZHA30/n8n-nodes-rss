import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url)));
const pkg = read("package.json");
const lock = read("package-lock.json");
const tag = process.env.RELEASE_TAG;
assert.match(tag ?? "", /^v\d+\.\d+\.\d+$/u, "Use a stable vX.Y.Z version tag");
assert.equal(tag, `v${pkg.version}`, "Tag must match package.json version");
assert.equal(lock.name, pkg.name, "Lockfile package name must match");
assert.equal(lock.version, pkg.version, "Lockfile version must match");
assert.equal(lock.packages[""].name, pkg.name, "Lockfile root name must match");
assert.equal(lock.packages[""].version, pkg.version, "Lockfile root version must match");
assert.equal(pkg.name, "n8n-nodes-rss");
assert.equal(pkg.publishConfig.access, "public");
assert.equal(pkg.publishConfig.registry, "https://registry.npmjs.org/");
assert.equal(
  pkg.repository.url,
  `git+https://github.com/${process.env.GITHUB_REPOSITORY}.git`,
  "Repository metadata must match the publishing GitHub repository",
);
console.log(`Release identity checked: ${pkg.name}@${pkg.version}`);
