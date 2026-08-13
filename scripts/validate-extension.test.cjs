const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { validateExtension } = require('./validate-extension.cjs');

function createFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'libby-extension-validator-'));
  fs.mkdirSync(path.join(directory, 'background'));
  fs.mkdirSync(path.join(directory, 'content'));
  fs.mkdirSync(path.join(directory, 'icons'));
  fs.writeFileSync(path.join(directory, 'background', 'worker.js'), '(() => {})();\n');
  fs.writeFileSync(path.join(directory, 'content', 'content.js'), '(() => {})();\n');
  fs.writeFileSync(path.join(directory, 'icons', 'icon.png'), 'fixture');
  fs.writeFileSync(
    path.join(directory, 'manifest.json'),
    JSON.stringify({
      manifest_version: 3,
      name: 'Fixture',
      description: 'Fixture extension',
      version: '1.2.3',
      permissions: ['storage'],
      host_permissions: ['https://example.com/*'],
      icons: { 16: 'icons/icon.png' },
      background: { service_worker: 'background/worker.js' },
      content_scripts: [{ matches: ['https://example.com/*'], js: ['content/content.js'] }],
    })
  );
  return directory;
}

test('accepts the built Chrome extension', () => {
  assert.deepEqual(validateExtension(), []);
});

test('rejects missing files, path traversal, and ESM content scripts', (context) => {
  const directory = createFixture();
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const manifestPath = path.join(directory, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.icons[48] = '../outside.png';
  manifest.content_scripts[0].css = ['styles/missing.css'];
  fs.writeFileSync(path.join(directory, 'content', 'content.js'), 'export const value = 1;\n');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));

  const errors = validateExtension(directory);
  assert(errors.some((error) => error.includes('escapes the extension directory')));
  assert(errors.some((error) => error.includes('does not reference a file')));
  assert(errors.some((error) => error.includes('contains ESM syntax')));
});

test('fails closed for invalid JSON and manifest shape', (context) => {
  const directory = createFixture();
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'manifest.json'), '{');

  assert.match(validateExtension(directory)[0], /cannot be read as JSON/);
});
