const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function parseWorkflowTriggers(workflow) {
  const lines = workflow.split(/\r?\n/);
  const onIndexes = lines
    .map((line, index) => (line === 'on:' ? index : -1))
    .filter((index) => index !== -1);

  assert.deepEqual(onIndexes.length, 1, 'workflow must contain one block-style top-level on key');

  const triggers = {};
  let eventName;
  let filterName;

  for (let index = onIndexes[0] + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!line.startsWith(' ')) break;

    const event = line.match(/^  ([a-z][a-z0-9_-]*):\s*$/);
    if (event) {
      eventName = event[1];
      filterName = undefined;
      assert.equal(triggers[eventName], undefined, `duplicate workflow trigger: ${eventName}`);
      triggers[eventName] = {};
      continue;
    }

    const filter = line.match(/^    ([a-z][a-z0-9_-]*):\s*$/);
    if (filter) {
      assert.ok(eventName, `workflow filter has no trigger: ${line.trim()}`);
      filterName = filter[1];
      assert.equal(
        triggers[eventName][filterName],
        undefined,
        `duplicate ${eventName} filter: ${filterName}`
      );
      triggers[eventName][filterName] = [];
      continue;
    }

    const item = line.match(/^      -\s+(.+?)\s*$/);
    if (item) {
      assert.ok(eventName && filterName, `workflow list item has no filter: ${line.trim()}`);
      const quotedValue = item[1];
      const quote = quotedValue[0];
      const value = quote === "'" || quote === '"' ? quotedValue.slice(1, -1) : quotedValue;
      assert.ok(
        quote !== "'" && quote !== '"' ? true : quotedValue.endsWith(quote),
        `unterminated workflow trigger value: ${quotedValue}`
      );
      triggers[eventName][filterName].push(value);
      continue;
    }

    assert.fail(`unsupported workflow trigger syntax: ${line.trim()}`);
  }

  return triggers;
}

function assertTagOnlyReleaseWorkflow(release) {
  assert.deepEqual(parseWorkflowTriggers(release), {
    push: {
      tags: ['v*'],
    },
  });
}

const expectedNativeSelectors = {
  'node_modules/@rolldown/binding-linux-arm64-gnu': {
    optional: true,
    os: ['linux'],
    cpu: ['arm64'],
    libc: ['glibc'],
  },
  'node_modules/@rolldown/binding-linux-arm64-musl': {
    optional: true,
    os: ['linux'],
    cpu: ['arm64'],
    libc: ['musl'],
  },
  'node_modules/@rolldown/binding-linux-ppc64-gnu': {
    optional: true,
    os: ['linux'],
    cpu: ['ppc64'],
    libc: ['glibc'],
  },
  'node_modules/@rolldown/binding-linux-s390x-gnu': {
    optional: true,
    os: ['linux'],
    cpu: ['s390x'],
    libc: ['glibc'],
  },
  'node_modules/@rolldown/binding-linux-x64-gnu': {
    optional: true,
    os: ['linux'],
    cpu: ['x64'],
    libc: ['glibc'],
  },
  'node_modules/@rolldown/binding-linux-x64-musl': {
    optional: true,
    os: ['linux'],
    cpu: ['x64'],
    libc: ['musl'],
  },
  'node_modules/@unrs/resolver-binding-linux-arm64-gnu': {
    optional: true,
    os: ['linux'],
    cpu: ['arm64'],
    libc: ['glibc'],
  },
  'node_modules/@unrs/resolver-binding-linux-arm64-musl': {
    optional: true,
    os: ['linux'],
    cpu: ['arm64'],
    libc: ['musl'],
  },
  'node_modules/@unrs/resolver-binding-linux-ppc64-gnu': {
    optional: true,
    os: ['linux'],
    cpu: ['ppc64'],
    libc: ['glibc'],
  },
  'node_modules/@unrs/resolver-binding-linux-riscv64-gnu': {
    optional: true,
    os: ['linux'],
    cpu: ['riscv64'],
    libc: ['glibc'],
  },
  'node_modules/@unrs/resolver-binding-linux-riscv64-musl': {
    optional: true,
    os: ['linux'],
    cpu: ['riscv64'],
    libc: ['musl'],
  },
  'node_modules/@unrs/resolver-binding-linux-s390x-gnu': {
    optional: true,
    os: ['linux'],
    cpu: ['s390x'],
    libc: ['glibc'],
  },
  'node_modules/@unrs/resolver-binding-linux-x64-gnu': {
    optional: true,
    os: ['linux'],
    cpu: ['x64'],
    libc: ['glibc'],
  },
  'node_modules/@unrs/resolver-binding-linux-x64-musl': {
    optional: true,
    os: ['linux'],
    cpu: ['x64'],
    libc: ['musl'],
  },
  'node_modules/lightningcss-linux-arm64-gnu': {
    optional: true,
    os: ['linux'],
    cpu: ['arm64'],
    libc: ['glibc'],
  },
  'node_modules/lightningcss-linux-arm64-musl': {
    optional: true,
    os: ['linux'],
    cpu: ['arm64'],
    libc: ['musl'],
  },
  'node_modules/lightningcss-linux-x64-gnu': {
    optional: true,
    os: ['linux'],
    cpu: ['x64'],
    libc: ['glibc'],
  },
  'node_modules/lightningcss-linux-x64-musl': {
    optional: true,
    os: ['linux'],
    cpu: ['x64'],
    libc: ['musl'],
  },
};

function assertNativeSelectorContract(packageLock) {
  const expectedPaths = Object.keys(expectedNativeSelectors).sort();
  const actualPaths = Object.entries(packageLock.packages)
    .filter(([, packageEntry]) => packageEntry.libc !== undefined)
    .map(([packagePath]) => packagePath)
    .sort();

  assert.equal(expectedPaths.length, 18);
  assert.equal(
    expectedPaths.filter((packagePath) => packagePath.includes('@unrs/resolver-binding')).length,
    8
  );
  assert.deepEqual(actualPaths, expectedPaths, 'libc-bearing native package set');

  for (const [packagePath, expected] of Object.entries(expectedNativeSelectors)) {
    const packageEntry = packageLock.packages[packagePath];
    assert.ok(packageEntry, `missing native package: ${packagePath}`);
    assert.deepEqual(
      {
        optional: packageEntry.optional,
        os: packageEntry.os,
        cpu: packageEntry.cpu,
        libc: packageEntry.libc,
      },
      expected,
      packagePath
    );
  }
}

test('Renovate owns only routine npm and Actions updates', () => {
  const config = JSON.parse(read('renovate.json'));
  const automergeRules = config.packageRules.filter((rule) => rule.automerge === true);
  const majorRules = config.packageRules.filter((rule) => rule.matchUpdateTypes?.includes('major'));
  const preOnePatchRules = config.packageRules.filter(
    (rule) => rule.matchCurrentVersion === '/^0\\./' && rule.matchUpdateTypes?.includes('patch')
  );
  const preOneExceptionRules = config.packageRules.filter(
    (rule) => rule.matchCurrentVersion === '/^0\\./' && rule.matchUpdateTypes?.includes('minor')
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
  assert.equal(config.lockFileMaintenance.minimumReleaseAge, undefined);
  assert.equal(config.lockFileMaintenance.dependencyDashboardApproval, true);
  assert.equal(config.lockFileMaintenance.automerge, false);
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
  const packageJson = JSON.parse(read('package.json'));
  const packageLock = JSON.parse(read('package-lock.json'));
  const nodeVersion = read('.nvmrc').trim();
  const npmPin = /name: Pin npm\s*\n\s*run: npm install -g npm@([^\s]+)/;
  const ciNpmVersion = ci.match(npmPin);
  const releaseNpmVersion = release.match(npmPin);

  assert.match(ci, /node --test scripts\/automation-policy\.test\.cjs/);
  assertTagOnlyReleaseWorkflow(release);
  assert.match(release, /permissions:\s*\n\s*contents:\s*write/);
  assert.equal(nodeVersion, '24.19.0');
  assert.deepEqual(packageJson.engines, {
    node: '>=24.19.0 <25',
    npm: '>=11.17.0 <12',
  });
  assert.equal(packageJson.packageManager, 'npm@11.17.0');
  assert.equal(packageJson.devDependencies['@types/node'], '^24.13.3');
  assert.deepEqual(packageLock.packages[''].engines, packageJson.engines);
  assert.equal(
    packageLock.packages[''].devDependencies['@types/node'],
    packageJson.devDependencies['@types/node']
  );
  assert.match(ci, /node-version-file: '\.nvmrc'/);
  assert.match(release, /node-version-file: '\.nvmrc'/);
  assert.doesNotMatch(ci, /node-version:/);
  assert.doesNotMatch(release, /node-version:/);
  assert.ok(ciNpmVersion);
  assert.ok(releaseNpmVersion);
  assert.equal(`npm@${ciNpmVersion[1]}`, packageJson.packageManager);
  assert.equal(releaseNpmVersion[1], ciNpmVersion[1]);
  assert.ok(ci.indexOf('name: Pin npm') < ci.indexOf('run: npm ci'));
  assert.ok(release.indexOf('name: Pin npm') < release.indexOf('run: npm ci'));
  assert.doesNotMatch(ci, /pull-requests:\s*write/);
  assert.doesNotMatch(ci, /contents:\s*write/);
});

test('npm lockfile preserves every published native Linux selector tuple', () => {
  const packageLock = JSON.parse(read('package-lock.json'));

  assertNativeSelectorContract(packageLock);
});

test('native selector policy rejects optional, OS, CPU, and libc loss', () => {
  const mutations = [
    ['node_modules/@rolldown/binding-linux-arm64-gnu', 'optional'],
    ['node_modules/lightningcss-linux-arm64-musl', 'os'],
    ['node_modules/@unrs/resolver-binding-linux-riscv64-gnu', 'cpu'],
    ['node_modules/@unrs/resolver-binding-linux-x64-musl', 'libc'],
  ];

  for (const [packagePath, selector] of mutations) {
    const packageLock = JSON.parse(read('package-lock.json'));
    delete packageLock.packages[packagePath][selector];
    assert.throws(
      () => assertNativeSelectorContract(packageLock),
      (error) => error instanceof assert.AssertionError && error.message.includes(packagePath),
      `${packagePath} must reject missing ${selector}`
    );
  }
});

test('release trigger policy rejects every additional event', () => {
  const release = read('.github/workflows/release.yml');
  const additionalEvents = ['workflow_dispatch', 'schedule', 'pull_request'];

  for (const eventName of additionalEvents) {
    const mutated = release.replace('on:\n', `on:\n  ${eventName}:\n`);
    assert.throws(
      () => assertTagOnlyReleaseWorkflow(mutated),
      assert.AssertionError,
      `${eventName} must not be accepted by the release workflow`
    );
  }
});
