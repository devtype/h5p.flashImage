#!/usr/bin/env node
/**
 * Build an H5P.FlashImage library package (.h5p).
 * Includes only runtime files required by library.json.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outputName = process.argv[2] || 'H5P.FlashImage.h5p';
const outputPath = join(root, outputName);

const INCLUDE = [
  'library.json',
  'semantics.json',
  'upgrades.js',
  'icon.svg',
  'LICENSE',
  'dist/h5p-flashimage.js',
  'dist/h5p-flashimage.css',
  'language/en.json',
  'language/de.json',
  'language/fr.json',
  'language/nl.json',
  'language/es.json'
];

console.log('Building dist…');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

if (existsSync(outputPath)) {
  execSync(`rm -f "${outputPath}"`, { cwd: root });
}

const files = INCLUDE.map((f) => `"${f}"`).join(' ');
execSync(`zip -rq "${outputName}" ${files}`, { cwd: root, stdio: 'inherit' });

console.log(`Created ${outputName}`);
