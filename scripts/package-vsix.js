#!/usr/bin/env node
const { mkdirSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const pkg = require('../package.json');
const outDir = join(__dirname, '..', 'build-extension');
const outFile = join(outDir, `${pkg.name}-${pkg.version}.vsix`);

mkdirSync(outDir, { recursive: true });

const vsce = spawnSync(
  'npx',
  ['vsce', 'package', '--allow-missing-repository', '--out', outFile],
  { stdio: 'inherit', shell: true }
);

process.exit(vsce.status ?? 1);
