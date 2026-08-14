const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('Renovate owns only routine npm and Actions updates', () => {
  const config = JSON.parse(read('renovate.json'));
  const automergeRules = config.packageRules.filter((rule) => rule.automerge === true);
  const majorRules = config.packageRules.filter((rule) =>
    rule.matchUpdateTypes?.includes('major')
  );
  const preOnePatchRules = config.packageRules.filter(
    (rule) =>
      rule.matchCurrentVersion === '/^0\\./' && rule.matchUpdateTypes?.includes('patch')
  );
  const preOneExceptionRules = config.packageRules.filter(
    (rule) =>
      rule.matchCurrentVersion === '/^0\\./' && rule.matchUpdateTypes?.includes('minor')
  );

  assert.equal(config.enabled, true);
  assert.deepEqual(new Set(config.enabledManagers), new Set(['npm', 'github-actions']));
  assert.equal(config.vulnerabilityAlerts.enabled, false);
  assert.equal(config.semanticCommits, 'enabled');
  assert.equal(config.platformAutomerge, true);
  assert.equal(config.automergeType, 'pr');
  assert.equal(config.automergeStrategy, 'squash');
  assert.equal(config.rebaseWhen, 'behind-base-branch');
  assert.equal(config.internalChecksFilter, 'strict');
  assert.equal(config.lockFileMaintenance.minimumReleaseAge, '7 days');
  assert.ok(automergeRules.length > 0);
  assert.ok(automergeRules.every((rule) => rule.minimumReleaseAge));
  assert.ok(majorRules.length > 0);
  assert.ok(majorRules.every((rule) => rule.automerge === false));
  assert.ok(majorRules.every((rule) => rule.dependencyDashboardApproval === true));
  assert.equal(preOnePatchRules.length, 1);
  assert.equal(preOnePatchRules[0].automerge, true);
  assert.equal(preOnePatchRules[0].minimumReleaseAge, '7 days');
  assert.equal(preOneExceptionRules.length, 1);
  assert.equal(preOneExceptionRules[0].automerge, false);
  assert.equal(preOneExceptionRules[0].dependencyDashboardApproval, true);
});

test('Dependabot retains security coverage without routine version PRs', () => {
  const dependabot = read('.github/dependabot.yml');

  assert.deepEqual(
    [...dependabot.matchAll(/package-ecosystem: '([^']+)'/g)].map((match) => match[1]),
    ['npm', 'github-actions']
  );
  assert.deepEqual(
    [...dependabot.matchAll(/directory: '([^']+)'/g)].map((match) => match[1]),
    ['/', '/']
  );
  assert.equal((dependabot.match(/open-pull-requests-limit: 0/g) ?? []).length, 2);
});

test('CI enforces the ownership contract and releases remain tag-only', () => {
  const ci = read('.github/workflows/ci.yml');
  const release = read('.github/workflows/release.yml');

  assert.match(ci, /node --test scripts\/automation-policy\.test\.cjs/);
  assert.match(release, /push:\s*\n\s*tags:\s*\n\s*- 'v\*'/);
  assert.doesNotMatch(ci, /pull-requests:\s*write/);
  assert.doesNotMatch(ci, /contents:\s*write/);
});
