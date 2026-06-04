#!/usr/bin/env node
/**
 * Rewrites relative imports to @app/* path aliases after monorepo move.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const libsDir = path.join(root, 'libs');

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith('.ts')) files.push(p);
  }
  return files;
}

function rewrite(content) {
  let out = content;

  // common — any depth of ../
  out = out.replace(
    /from ['"](?:\.\.\/)+common\//g,
    "from '@app/common/",
  );

  // core
  out = out.replace(/from ['"](?:\.\.\/)+core\//g, "from '@app/core/");

  // config (now under core/config)
  out = out.replace(/from ['"](?:\.\.\/)+config\//g, "from '@app/core/config/");

  // app.module paths in leftover src
  out = out.replace(/from '\.\/common\//g, "from '@app/common/");
  out = out.replace(/from '\.\/config\//g, "from '@app/core/config/");
  out = out.replace(/from '\.\/core\//g, "from '@app/core/");
  out = out.replace(/from '\.\/modules\//g, "from '@app/modules/");

  return out;
}

const files = walk(libsDir);
let changed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const after = rewrite(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
  }
}

// src leftovers
for (const file of ['app.module.ts', 'main.ts'].map((f) => path.join(root, 'src', f))) {
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const after = rewrite(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
  }
}

console.log(`Updated ${changed} files`);
