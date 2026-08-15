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

function extractNamedStep(workflow, name) {
  const lines = workflow.split(/\r?\n/);
  const marker = `      - name: ${name}`;
  const starts = lines
    .map((line, index) => (line === marker ? index : -1))
    .filter((index) => index !== -1);

  assert.equal(starts.length, 1, `${name} must appear exactly once`);

  const start = starts[0];
  const nextStep = lines.findIndex(
    (line, index) => index > start && line.startsWith('      - name: ')
  );
  const end = nextStep === -1 ? lines.length : nextStep;

  return lines.slice(start, end).join('\n');
}

function assertCodecovOIDCContract(ci) {
  assert.match(ci, /^permissions:\n  contents: read\n\njobs:/m);
  assert.match(
    ci,
    /jobs:\n  test:\n    name: Test and Build\n    permissions:\n      contents: read\n      id-token: write\n/m
  );
  assert.equal((ci.match(/^\s+id-token:/gm) ?? []).length, 1);

  const codecovStep = extractNamedStep(ci, 'Upload coverage to Codecov');
  assert.match(
    codecovStep,
    /^\s+uses: codecov\/codecov-action@fb8b3582c8e4def4969c97caa2f19720cb33a72f\s+# v7\.0\.0$/m
  );
  assert.equal((codecovStep.match(/^\s+use_oidc:/gm) ?? []).length, 1);
  assert.match(codecovStep, /^\s+use_oidc: true$/m);
  assert.equal((codecovStep.match(/^\s+fail_ci_if_error:/gm) ?? []).length, 1);
  assert.match(codecovStep, /^\s+fail_ci_if_error: true$/m);
  assert.doesNotMatch(codecovStep, /^\s+(?:codecov_)?token:/m);
  assert.doesNotMatch(codecovStep, /\$\{\{\s*secrets\./);
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

const approvalGatedUpdateTypes = ['digest', 'pin', 'pinDigest', 'lockFileMaintenance'];
const automaticRuleContracts = [
  {
    matchManagers: ['npm'],
    matchDepTypes: ['dependencies', 'optionalDependencies'],
    matchCurrentVersion: '!/^0\\./',
    matchUpdateTypes: ['patch', 'minor'],
    groupName: 'runtime dependencies',
    minimumReleaseAge: '7 days',
  },
  {
    matchManagers: ['npm'],
    matchDepTypes: ['devDependencies'],
    matchCurrentVersion: '!/^0\\./',
    matchUpdateTypes: ['patch', 'minor'],
    groupName: 'development dependencies',
    minimumReleaseAge: '7 days',
  },
  {
    matchManagers: ['npm'],
    matchDepTypes: ['overrides'],
    matchUpdateTypes: ['patch'],
    minimumReleaseAge: '7 days',
  },
  {
    matchManagers: ['github-actions'],
    matchUpdateTypes: ['patch', 'minor'],
    groupName: 'github actions',
    minimumReleaseAge: '14 days',
  },
  {
    matchManagers: ['npm'],
    matchCurrentVersion: '/^0\\./',
    matchUpdateTypes: ['patch'],
    minimumReleaseAge: '7 days',
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertUnconstrainedApprovalRule(rule, expectedUpdateTypes) {
  assert.ok(rule, `missing approval rule for ${expectedUpdateTypes.join(', ')}`);
  assert.deepEqual(
    Object.keys(rule).sort(),
    ['automerge', 'dependencyDashboardApproval', 'description', 'matchUpdateTypes'].sort(),
    'approval rule must not contain any matcher, exclusion, age, group, or other scope constraint'
  );
  assert.deepEqual(rule.matchUpdateTypes, expectedUpdateTypes);
  assert.equal(rule.dependencyDashboardApproval, true);
  assert.equal(rule.automerge, false);
}

function automaticRuleContract(rule) {
  return Object.fromEntries(
    Object.keys(automaticRuleContracts[0])
      .filter((key) => rule[key] !== undefined)
      .map((key) => [key, rule[key]])
  );
}

function assertRenovateRoutinePolicy(config) {
  const automergeRules = config.packageRules.filter((rule) => rule.automerge === true);
  const majorRules = config.packageRules.filter((rule) => rule.matchUpdateTypes?.includes('major'));
  const preOnePatchRules = config.packageRules.filter(
    (rule) => rule.matchCurrentVersion === '/^0\\./' && rule.automerge === true
  );
  const preOneExceptionRules = config.packageRules.filter(
    (rule) => rule.matchCurrentVersion === '/^0\\./' && rule.matchUpdateTypes?.includes('minor')
  );
  const overridePatchRules = config.packageRules.filter(
    (rule) =>
      rule.matchDepTypes?.includes('overrides') &&
      rule.matchUpdateTypes?.includes('patch') &&
      rule.automerge === true
  );
  const overrideMinorRules = config.packageRules.filter(
    (rule) => rule.matchDepTypes?.includes('overrides') && rule.matchUpdateTypes?.includes('minor')
  );
  const pinDigestRules = config.packageRules.filter(
    (rule) => JSON.stringify(rule.matchUpdateTypes) === JSON.stringify(['digest', 'pin', 'pinDigest'])
  );
  const lockMaintenanceRules = config.packageRules.filter(
    (rule) => JSON.stringify(rule.matchUpdateTypes) === JSON.stringify(['lockFileMaintenance'])
  );

  assert.equal(config.lockFileMaintenance.enabled, true);
  assert.deepEqual(config.lockFileMaintenance.schedule, ['before 6am on monday']);
  assert.equal(config.lockFileMaintenance.minimumReleaseAge, undefined);
  assert.equal(config.lockFileMaintenance.dependencyDashboardApproval, true);
  assert.equal(config.lockFileMaintenance.automerge, false);

  assert.equal(automergeRules.length, automaticRuleContracts.length);
  assert.deepEqual(
    automergeRules.map(automaticRuleContract),
    automaticRuleContracts,
    'automerge rules must remain exactly within the proven npm and Actions scopes'
  );
  for (const [index, rule] of automergeRules.entries()) {
    assert.deepEqual(
      Object.keys(rule).sort(),
      ['automerge', 'description', ...Object.keys(automaticRuleContracts[index])].sort(),
      'automerge rules must not contain extra matchers, exclusions, or behavior overrides'
    );
  }

  for (const updateType of approvalGatedUpdateTypes) {
    const matchingRules = config.packageRules.filter((rule) =>
      rule.matchUpdateTypes?.includes(updateType)
    );
    assert.ok(matchingRules.length > 0, `missing rule for ${updateType}`);
    assert.ok(
      matchingRules.every((rule) => rule.automerge !== true),
      `${updateType} must never automerge`
    );
  }

  assert.equal(pinDigestRules.length, 1);
  assertUnconstrainedApprovalRule(pinDigestRules[0], ['digest', 'pin', 'pinDigest']);
  assert.equal(lockMaintenanceRules.length, 1);
  assertUnconstrainedApprovalRule(lockMaintenanceRules[0], ['lockFileMaintenance']);

  assert.equal(overridePatchRules.length, 1);
  assert.deepEqual(overridePatchRules[0].matchUpdateTypes, ['patch']);
  assert.equal(overridePatchRules[0].minimumReleaseAge, '7 days');
  assert.equal(overrideMinorRules.length, 1);
  assert.equal(overrideMinorRules[0].dependencyDashboardApproval, true);
  assert.equal(overrideMinorRules[0].automerge, false);
  assert.equal(overrideMinorRules[0].minimumReleaseAge, undefined);

  assert.ok(majorRules.length > 0);
  assert.ok(majorRules.every((rule) => rule.automerge === false));
  assert.ok(majorRules.every((rule) => rule.dependencyDashboardApproval === true));
  assert.ok(majorRules.every((rule) => rule.minimumReleaseAge === undefined));
  assert.equal(preOnePatchRules.length, 1);
  assert.deepEqual(preOnePatchRules[0].matchUpdateTypes, ['patch']);
  assert.equal(preOnePatchRules[0].minimumReleaseAge, '7 days');
  assert.equal(preOneExceptionRules.length, 1);
  assert.equal(preOneExceptionRules[0].automerge, false);
  assert.equal(preOneExceptionRules[0].dependencyDashboardApproval, true);
  assert.equal(preOneExceptionRules[0].minimumReleaseAge, undefined);
}

test('Renovate owns only routine npm and Actions updates', () => {
  const config = JSON.parse(read('renovate.json'));

  assert.equal(config.enabled, true);
  assert.deepEqual(new Set(config.enabledManagers), new Set(['npm', 'github-actions']));
  assert.equal(config.vulnerabilityAlerts.enabled, false);
  assert.equal(config.semanticCommits, 'enabled');
  assert.equal(config.platformAutomerge, true);
  assert.equal(config.automergeType, 'pr');
  assert.equal(config.automergeStrategy, 'squash');
  assert.equal(config.rebaseWhen, 'behind-base-branch');
  assert.equal(config.internalChecksFilter, 'strict');
  assertRenovateRoutinePolicy(config);
});

test('Renovate policy rejects unsafe update enrollment and narrowed approval gates', () => {
  const config = JSON.parse(read('renovate.json'));

  for (const updateType of approvalGatedUpdateTypes) {
    const unsafeAutomerge = clone(config);
    unsafeAutomerge.packageRules.push({
      matchUpdateTypes: [updateType],
      minimumReleaseAge: '7 days',
      automerge: true,
    });
    assert.throws(() => assertRenovateRoutinePolicy(unsafeAutomerge), assert.AssertionError);
  }

  const missingApproval = clone(config);
  const pinDigestRule = missingApproval.packageRules.find(
    (rule) => JSON.stringify(rule.matchUpdateTypes) === JSON.stringify(['digest', 'pin', 'pinDigest'])
  );
  delete pinDigestRule.dependencyDashboardApproval;
  assert.throws(() => assertRenovateRoutinePolicy(missingApproval), assert.AssertionError);

  const narrowedApproval = clone(config);
  const lockMaintenanceRule = narrowedApproval.packageRules.find(
    (rule) => JSON.stringify(rule.matchUpdateTypes) === JSON.stringify(['lockFileMaintenance'])
  );
  lockMaintenanceRule.matchManagers = ['npm'];
  assert.throws(() => assertRenovateRoutinePolicy(narrowedApproval), assert.AssertionError);

  const narrowedByUnlistedMatcher = clone(config);
  const narrowedPinDigestRule = narrowedByUnlistedMatcher.packageRules.find(
    (rule) => JSON.stringify(rule.matchUpdateTypes) === JSON.stringify(['digest', 'pin', 'pinDigest'])
  );
  narrowedPinDigestRule.matchDatasources = ['npm'];
  assert.throws(
    () => assertRenovateRoutinePolicy(narrowedByUnlistedMatcher),
    assert.AssertionError
  );

  const broadNpmAutomerge = clone(config);
  broadNpmAutomerge.packageRules.push({
    matchManagers: ['npm'],
    matchUpdateTypes: ['patch', 'minor'],
    minimumReleaseAge: '7 days',
    automerge: true,
  });
  assert.throws(() => assertRenovateRoutinePolicy(broadNpmAutomerge), assert.AssertionError);

  const unsafeOverrideMinor = clone(config);
  const overrideMinorRule = unsafeOverrideMinor.packageRules.find(
    (rule) => rule.matchDepTypes?.includes('overrides') && rule.matchUpdateTypes?.includes('minor')
  );
  overrideMinorRule.automerge = true;
  assert.throws(() => assertRenovateRoutinePolicy(unsafeOverrideMinor), assert.AssertionError);

  const youngActions = clone(config);
  const actionsRule = youngActions.packageRules.find((rule) =>
    rule.matchManagers?.includes('github-actions')
  );
  actionsRule.minimumReleaseAge = '7 days';
  assert.throws(() => assertRenovateRoutinePolicy(youngActions), assert.AssertionError);

  const unsafePreOneMinor = clone(config);
  const preOnePatchRule = unsafePreOneMinor.packageRules.find(
    (rule) => rule.matchCurrentVersion === '/^0\\./' && rule.automerge === true
  );
  preOnePatchRule.matchUpdateTypes.push('minor');
  assert.throws(() => assertRenovateRoutinePolicy(unsafePreOneMinor), assert.AssertionError);
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

test('Codecov uses job-scoped OIDC and fails closed without stored tokens', () => {
  const ci = read('.github/workflows/ci.yml');

  assertCodecovOIDCContract(ci);

  const mutations = [
    ci.replace('      id-token: write\n', ''),
    ci.replace('          use_oidc: true\n', '          use_oidc: false\n'),
    ci.replace('          fail_ci_if_error: true\n', '          fail_ci_if_error: false\n'),
    ci.replace('          use_oidc: true\n', '          use_oidc: true\n          token: secret\n'),
    ci.replace('permissions:\n  contents: read\n', 'permissions:\n  contents: read\n  id-token: write\n'),
  ];

  for (const mutated of mutations) {
    assert.throws(() => assertCodecovOIDCContract(mutated), assert.AssertionError);
  }
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
