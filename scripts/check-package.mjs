import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../package.json', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const file of [...pkg.n8n.nodes, ...(pkg.n8n.credentials ?? [])]) {
  const path = resolve(root, file);
  assert.ok(existsSync(path), `Missing registered module: ${file}`);
  for (const Type of Object.values(require(path))) {
    if (typeof Type !== 'function') continue;
    const instance = new Type();
    const description = instance.description ?? instance;
    const icon = description.icon;
    for (const variant of typeof icon === 'string' ? [icon] : Object.values(icon ?? {})) {
      if (variant.startsWith('file:')) {
        assert.ok(existsSync(resolve(dirname(path), variant.slice(5))), `Missing icon: ${variant}`);
      }
    }
  }
  const metadata = file.replace(/\.js$/, '.json');
  if (existsSync(join(root, metadata.replace(/^dist\//, '')))) {
    assert.ok(existsSync(join(root, metadata)), `Missing node metadata: ${metadata}`);
    JSON.parse(readFileSync(join(root, metadata), 'utf8'));
  }
}
console.log(`Package modules and assets checked: ${pkg.name}@${pkg.version}`);
