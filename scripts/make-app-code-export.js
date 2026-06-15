const fs = require('fs');
const path = require('path');

const root = process.cwd();
const out = path.join(root, 'world-cup-2026-app-code.txt');
const includeDirs = ['src', 'prisma', 'scripts'];
const includeFiles = ['package.json', 'next.config.ts', 'tsconfig.json', '.env.example'];
const skipNames = new Set(['node_modules', '.next', '.git']);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (skipNames.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

const parts = [];
parts.push('WORLD CUP 2026 APP CODE EXPORT\n');
parts.push('This file is a plain-text export of the app files from the workspace.\n');
parts.push('---\n');
for (const rel of includeFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  parts.push(`\n===== FILE: ${rel} =====\n`);
  parts.push(fs.readFileSync(full, 'utf8'));
  parts.push('\n');
}
for (const dir of includeDirs) {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) continue;
  const files = walk(fullDir).sort((a, b) => a.localeCompare(b));
  for (const full of files) {
    const rel = path.relative(root, full).replace(/\\/g, '/');
    parts.push(`\n===== FILE: ${rel} =====\n`);
    parts.push(fs.readFileSync(full, 'utf8'));
    parts.push('\n');
  }
}
fs.writeFileSync(out, parts.join(''), 'utf8');
console.log(out);
