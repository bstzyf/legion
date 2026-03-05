#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'checksums.sha256');

const INCLUDE = [
  'bin',
  'agents',
  'commands',
  'skills',
  'adapters',
  'settings.json',
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'docs/security',
  'docs/settings.schema.json',
];

function normalize(filePath) {
  return filePath.split(path.sep).join('/');
}

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walk(dirPath, out) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
    } else {
      out.push(abs);
    }
  }
}

function collectFiles() {
  const files = [];

  for (const rel of INCLUDE) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;

    if (fs.statSync(abs).isDirectory()) {
      walk(abs, files);
    } else {
      files.push(abs);
    }
  }

  return files
    .filter((abs) => path.basename(abs) !== 'checksums.sha256')
    .sort((a, b) => normalize(path.relative(ROOT, a)).localeCompare(normalize(path.relative(ROOT, b))));
}

function main() {
  const files = collectFiles();
  const lines = files.map((abs) => {
    const rel = normalize(path.relative(ROOT, abs));
    const hash = hashFile(abs);
    return `${hash}  ${rel}`;
  });

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n') + '\n');
  console.log(`Wrote ${lines.length} checksums to ${OUTPUT_FILE}`);
}

main();

