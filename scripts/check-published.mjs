import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url)),
);
const response = await fetch(
  `https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/${pkg.version}`,
  {
    signal: AbortSignal.timeout(30_000),
    headers: { "Cache-Control": "no-cache" },
  },
);
let exists = false;
if (response.ok) {
  const published = await response.json();
  const integrity = `sha512-${createHash("sha512").update(readFileSync(process.env.PACKAGE_FILE)).digest("base64")}`;
  assert.equal(
    published.dist.integrity,
    integrity,
    "This npm version already exists with different content; do not republish",
  );
  exists = true;
  console.log(
    `${pkg.name}@${pkg.version} already published with matching integrity`,
  );
} else {
  assert.equal(
    response.status,
    404,
    `npm registry returned ${response.status}; publish aborted`,
  );
  console.log(`${pkg.name}@${pkg.version} is not published`);
}
appendFileSync(process.env.GITHUB_OUTPUT, `exists=${exists}\n`);
