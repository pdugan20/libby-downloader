#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');

const DEFAULT_EXTENSION_DIR = path.resolve(__dirname, '..', 'chrome-extension');
const CHROME_VERSION = /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,3}$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isOutside(base, candidate) {
  const relative = path.relative(base, candidate);
  return relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}

function containsNodeType(value, type) {
  if (Array.isArray(value)) return value.some((item) => containsNodeType(item, type));
  if (!isObject(value)) return false;
  if (value.type === type) return true;
  return Object.values(value).some((item) => containsNodeType(item, type));
}

function validateStringArray(value, label, errors, { required = false } = {}) {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value) || (required && value.length === 0)) {
    errors.push(`${label} must be ${required ? 'a non-empty' : 'an'} array`);
    return [];
  }
  if (value.some((item) => typeof item !== 'string' || item.length === 0)) {
    errors.push(`${label} must contain only non-empty strings`);
    return [];
  }
  return value;
}

function validateReferencedFile(extensionDir, relativePath, label, errors, classicScript = false) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    errors.push(`${label} must be a non-empty relative path`);
    return;
  }

  const normalized = path.normalize(relativePath);
  const absolute = path.resolve(extensionDir, normalized);
  if (path.isAbsolute(relativePath) || isOutside(extensionDir, absolute)) {
    errors.push(`${label} escapes the extension directory: ${relativePath}`);
    return;
  }
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    errors.push(`${label} does not reference a file: ${relativePath}`);
    return;
  }
  const realExtensionDir = fs.realpathSync(extensionDir);
  const realAbsolute = fs.realpathSync(absolute);
  if (isOutside(realExtensionDir, realAbsolute)) {
    errors.push(`${label} resolves outside the extension directory: ${relativePath}`);
    return;
  }
  if (classicScript) {
    const source = fs.readFileSync(absolute, 'utf8');
    let program;
    try {
      program = acorn.parse(source, {
        allowHashBang: true,
        ecmaVersion: 'latest',
        sourceType: 'script',
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(`${label} is not valid classic-script syntax: ${relativePath} (${detail})`);
      return;
    }
    if (containsNodeType(program, 'ImportExpression')) {
      errors.push(`${label} contains a dynamic import but must be self-contained: ${relativePath}`);
    }
  }
}

function validateExtension(extensionDir = DEFAULT_EXTENSION_DIR) {
  const errors = [];
  const manifestPath = path.join(extensionDir, 'manifest.json');
  let manifest;

  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [`manifest.json cannot be read as JSON: ${detail}`];
  }

  if (!isObject(manifest)) return ['manifest.json must contain an object'];
  if (manifest.manifest_version !== 3) errors.push('manifest_version must be 3');
  for (const key of ['name', 'description']) {
    if (typeof manifest[key] !== 'string' || manifest[key].trim().length === 0) {
      errors.push(`${key} must be a non-empty string`);
    }
  }
  if (typeof manifest.version !== 'string' || !CHROME_VERSION.test(manifest.version)) {
    errors.push("version must use Chrome's one-to-four-component numeric format");
  }

  validateStringArray(manifest.permissions, 'permissions', errors);
  validateStringArray(manifest.host_permissions, 'host_permissions', errors);

  if (!isObject(manifest.icons) || Object.keys(manifest.icons).length === 0) {
    errors.push('icons must be a non-empty object');
  } else {
    for (const [size, icon] of Object.entries(manifest.icons)) {
      if (!/^\d+$/.test(size)) errors.push(`icons key must be numeric: ${size}`);
      validateReferencedFile(extensionDir, icon, `icons.${size}`, errors);
    }
  }

  if (!isObject(manifest.background)) {
    errors.push('background must be an object');
  } else {
    const isClassic = manifest.background.type !== 'module';
    validateReferencedFile(
      extensionDir,
      manifest.background.service_worker,
      'background.service_worker',
      errors,
      isClassic
    );
  }

  if (!Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) {
    errors.push('content_scripts must be a non-empty array');
  } else {
    manifest.content_scripts.forEach((entry, index) => {
      const label = `content_scripts[${index}]`;
      if (!isObject(entry)) {
        errors.push(`${label} must be an object`);
        return;
      }
      validateStringArray(entry.matches, `${label}.matches`, errors, { required: true });
      const scripts = validateStringArray(entry.js, `${label}.js`, errors);
      const styles = validateStringArray(entry.css, `${label}.css`, errors);
      if (scripts.length === 0 && styles.length === 0) {
        errors.push(`${label} must reference at least one JavaScript or CSS file`);
      }
      scripts.forEach((file, fileIndex) =>
        validateReferencedFile(extensionDir, file, `${label}.js[${fileIndex}]`, errors, true)
      );
      styles.forEach((file, fileIndex) =>
        validateReferencedFile(extensionDir, file, `${label}.css[${fileIndex}]`, errors)
      );
    });
  }

  return errors;
}

function main() {
  const errors = validateExtension();
  if (errors.length > 0) {
    console.error('Extension validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('Extension validation passed.');
}

if (require.main === module) main();

module.exports = { validateExtension };
