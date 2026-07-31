#!/usr/bin/env node
/**
 * Build an H5P.FlashImage library package (.h5p).
 * Includes the runnable library and H5PEditor.FlashImage editor widget.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outputName = process.argv[2] || 'H5P.FlashImage.h5p';
const outputPath = join(root, outputName);

const CONTENT_FILES = [
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

const EDITOR_FILES = [
  'library.json',
  'scripts/flashimage-answers.js',
  'language/en.json'
];

console.log('Building dist…');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

if (existsSync(outputPath)) {
  rmSync(outputPath);
}

const staging = join(tmpdir(), `h5p-flashimage-pack-${randomBytes(4).toString('hex')}`);
const contentDir = join(staging, 'H5P.FlashImage');
const editorDir = join(staging, 'H5PEditor.FlashImage');
mkdirSync(contentDir, { recursive: true });
mkdirSync(editorDir, { recursive: true });

for (const rel of CONTENT_FILES) {
  const from = join(root, rel);
  const to = join(contentDir, rel);
  mkdirSync(join(to, '..'), { recursive: true });
  cpSync(from, to);
}

for (const rel of EDITOR_FILES) {
  const from = join(root, 'H5PEditor.FlashImage', rel);
  const to = join(editorDir, rel);
  mkdirSync(join(to, '..'), { recursive: true });
  cpSync(from, to);
}

execSync(`zip -rq "${outputPath}" H5P.FlashImage H5PEditor.FlashImage`, {
  cwd: staging,
  stdio: 'inherit'
});
rmSync(staging, { recursive: true, force: true });

console.log(`Created ${outputName}`);
