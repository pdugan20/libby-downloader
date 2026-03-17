/**
 * Syncs the version from package.json into chrome-extension/manifest.json.
 * Called automatically by release-it after version bump.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const manifestPath = resolve(root, 'chrome-extension/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

manifest.version = pkg.version;

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

console.log(`[INFO] Synced manifest.json version to ${pkg.version}`);
