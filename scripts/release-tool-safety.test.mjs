import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer, Socket } from 'node:net';
import { once } from 'node:events';
import { readFile, writeFile, mkdir, mkdtemp, rm, cp, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { getUri } from 'get-uri';
import { PacProxyAgent } from 'pac-proxy-agent';
import { Client } from 'basic-ftp';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const stamp = '20260101000000';
const pac = 'function FindProxyForURL(url, host) { return "DIRECT"; }';

async function withFtp(options, work) {
  const sockets = new Set(),
    listeners = new Set();
  const commands = [];
  const server = createServer((control) => {
    sockets.add(control);
    control.on('close', () => sockets.delete(control));
    control.on('error', () => {});
    control.setEncoding('utf8');
    control.write('220 owned offline fixture\r\n');
    let buffer = '',
      dataReady;
    async function command(line) {
      const [verb, ...parts] = line.split(' ');
      const arg = parts.join(' ');
      commands.push(verb);
      if (verb === 'USER') control.write('331 password required\r\n');
      else if (verb === 'PASS') control.write('230 fixture login\r\n');
      else if (verb === 'FEAT')
        control.write(
          options.unix
            ? '211-Features\r\n UTF8\r\n211 End\r\n'
            : '211-Features\r\n UTF8\r\n MLST type*;size*;modify*;\r\n211 End\r\n'
        );
      else if (verb === 'MDTM')
        control.write(
          options.missing
            ? '550 fixture file missing\r\n'
            : options.fallback
              ? '502 MDTM unavailable\r\n'
              : `213 ${stamp}\r\n`
        );
      else if (verb === 'PWD') control.write('257 "/"\r\n');
      else if (verb === 'SIZE') control.write(`213 ${Buffer.byteLength(pac)}\r\n`);
      else if (verb === 'EPSV') {
        const passive = createServer();
        listeners.add(passive);
        dataReady = new Promise((resolve) =>
          passive.once('connection', (socket) => {
            sockets.add(socket);
            socket.on('error', () => {});
            socket.on('close', () => sockets.delete(socket));
            passive.close();
            resolve(socket);
          })
        );
        passive.listen(0, '127.0.0.1');
        await once(passive, 'listening');
        control.write(`229 Entering Extended Passive Mode (|||${passive.address().port}|)\r\n`);
      } else if (verb === 'RETR' || verb === 'MLSD' || verb === 'LIST') {
        control.write('150 transferring fixture\r\n');
        const socket = await dataReady;
        const listing =
          options.listing ?? `type=file;size=${pac.length};modify=${stamp}; proxy.pac\r\n`;
        socket.end(verb === 'RETR' ? pac : listing, () => {
          if (!control.destroyed) control.write('226 fixture transfer complete\r\n');
        });
      } else if (verb === 'QUIT') control.end('221 bye\r\n');
      else if (['TYPE', 'STRU', 'OPTS', 'CWD'].includes(verb))
        control.write('200 fixture command accepted\r\n');
      else throw new Error(`Unexpected fixture FTP command: ${verb} ${arg}`);
    }
    let sequence = Promise.resolve();
    control.on('data', (text) => {
      buffer += text;
      let boundary;
      while ((boundary = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        sequence = sequence
          .then(() => command(line))
          .catch((error) => {
            control.destroy(error);
          });
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await work(
      new URL(`ftp://fixture:fixture@127.0.0.1:${server.address().port}/proxy.pac`),
      commands
    );
  } finally {
    for (const socket of sockets) socket.destroy();
    await Promise.all(
      [...listeners, server].map(
        (listener) =>
          new Promise((resolve) => {
            if (!listener.listening) resolve();
            else listener.close(() => resolve());
          })
      )
    );
  }
}
async function text(stream) {
  let result = '';
  for await (const chunk of stream) result += chunk;
  return result;
}

test('the exact scoped dependency is the one get-uri and the release stack resolve', async () => {
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.deepEqual(manifest.overrides['get-uri@7.0.0'], { 'basic-ftp': '6.2.5' });
  const fromGetUri = createRequire(fileURLToPath(import.meta.resolve('get-uri')));
  const ftp = JSON.parse(
    await readFile(join(dirname(fromGetUri.resolve('basic-ftp')), '../package.json'), 'utf8')
  );
  assert.equal(ftp.version, '6.2.5');
  const { ProxyAgent } = await import('proxy-agent');
  const agent = new ProxyAgent();
  agent.destroy();
});
test('get-uri downloads through real MDTM and passive FTP sockets', async () =>
  withFtp({}, async (url, commands) => {
    const stream = await getUri(url);
    assert.equal(await text(stream), pac);
    assert.equal(stream.lastModified.toISOString(), '2026-01-01T00:00:00.000Z');
    assert.ok(commands.includes('MDTM'));
    assert.ok(commands.includes('EPSV'));
    assert.ok(commands.includes('RETR'));
  }));
test('get-uri retains its MLSD fallback when MDTM is unavailable', async () =>
  withFtp({ fallback: true }, async (url, commands) => {
    assert.equal(await text(await getUri(url)), pac);
    assert.ok(commands.includes('MLSD'));
  }));
test('get-uri retains cache and missing-file behavior', async () => {
  await withFtp({}, async (url) => {
    const stream = await getUri(url);
    await text(stream);
    await assert.rejects(getUri(url, { cache: stream }), { code: 'ENOTMODIFIED' });
  });
  await withFtp({ missing: true }, async (url) => {
    await assert.rejects(getUri(url), { code: 'ENOTFOUND' });
  });
});
test('PAC files load and compile through the real FTP dependency chain', async () =>
  withFtp({}, async (url) => {
    const agent = new PacProxyAgent(`pac+${url.href}`);
    try {
      const resolver = await agent.getResolver();
      assert.equal(await resolver('https://example.invalid/', 'example.invalid'), 'DIRECT');
    } finally {
      agent.destroy();
      agent.qjs?.dispose(false);
    }
  }));
test('valid Unix listings and listing byte limits remain supported', async () => {
  await withFtp(
    { unix: true, listing: '-rw-r--r-- 1 owner group 42 Jan 1 2020 proxy.pac\r\n' },
    async (url) => {
      const client = new Client(1000);
      try {
        await client.access({
          host: url.hostname,
          port: Number(url.port),
          user: 'fixture',
          password: 'fixture',
        });
        const files = await client.list('/');
        assert.equal(files[0].name, 'proxy.pac');
        assert.equal(files[0].size, 42);
      } finally {
        client.close();
      }
    }
  );
  await withFtp({ unix: true, listing: 'x'.repeat(2048) }, async (url) => {
    const client = new Client(1000, { maxListingBytes: 128 });
    try {
      await client.access({
        host: url.hostname,
        port: Number(url.port),
        user: 'fixture',
        password: 'fixture',
      });
      await assert.rejects(client.list('/'), /limit|exceed|maximum/i);
    } finally {
      client.close();
    }
  });
});
test('separate PASV hosts remain denied before any network connection', async (t) => {
  let connections = 0;
  t.mock.method(Socket.prototype, 'connect', () => {
    connections++;
    throw new Error('unexpected socket attempt');
  });
  const client = new Client(1000);
  try {
    const context = {
      socket: { remoteAddress: '127.0.0.1' },
      log() {},
      request: async (command) =>
        command === 'EPSV'
          ? { code: 502, message: '502 EPSV unavailable' }
          : { code: 227, message: '227 Entering Passive Mode (203,0,113,1,7,138)' },
    };
    await assert.rejects(client.prepareTransfer(context), /another host/);
    assert.equal(connections, 0);
  } finally {
    client.close();
  }
});
test('malformed Unix listing parsing finishes in a bounded child process', () => {
  const code = String.raw`const assert=require('node:assert/strict');const {parseList}=require('basic-ftp');const malformed='-rw-r--r-- 1 '+'a '.repeat(128*1024)+'!';const list=parseList(malformed+'\r\n-rw-r--r-- 1 owner group 42 Jan 1 2020 good.txt\r\n');assert.equal(list.length,1);assert.equal(list[0].name,'good.txt');`;
  const result = spawnSync(process.execPath, ['--max-old-space-size=64', '-e', code], {
    cwd: root,
    timeout: 2000,
    killSignal: 'SIGKILL',
    encoding: 'utf8',
    maxBuffer: 8192,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
});

test('the release CLI preserves dry-run state and its version/changelog/manifest hooks offline', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'libby-release-tool-'));
  const fixture = join(temporary, 'project'),
    origin = join(temporary, 'origin.git');
  const protectedFiles = [
    'package.json',
    'package-lock.json',
    'CHANGELOG.md',
    'chrome-extension/manifest.json',
    '.release-it.json',
  ];
  const originals = await Promise.all(protectedFiles.map((file) => readFile(join(root, file))));
  try {
    await mkdir(join(fixture, 'scripts'), { recursive: true });
    await mkdir(join(fixture, 'chrome-extension'), { recursive: true });
    await cp(join(root, '.release-it.json'), join(fixture, '.release-it.json'));
    await cp(join(root, 'scripts/sync-version.mjs'), join(fixture, 'scripts/sync-version.mjs'));
    await symlink(
      join(root, 'node_modules'),
      join(fixture, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
    const manifest = {
      name: 'libby-release-tool-fixture',
      version: '1.2.0',
      scripts: { 'check-all': 'node scripts/check-fixture.cjs' },
    };
    await writeFile(join(fixture, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
    await writeFile(
      join(fixture, 'package-lock.json'),
      JSON.stringify(
        {
          name: manifest.name,
          version: manifest.version,
          lockfileVersion: 3,
          requires: true,
          packages: { '': { name: manifest.name, version: manifest.version } },
        },
        null,
        2
      ) + '\n'
    );
    await writeFile(
      join(fixture, 'chrome-extension/manifest.json'),
      JSON.stringify({ manifest_version: 3, name: 'Offline fixture', version: '1.2.0' }, null, 2) +
        '\n'
    );
    await writeFile(join(fixture, 'CHANGELOG.md'), '# Changelog\n\nFixture baseline.\n');
    await writeFile(
      join(fixture, 'scripts/check-fixture.cjs'),
      `const fs=require('fs'),assert=require('assert');assert.equal(require('../package.json').version,require('../chrome-extension/manifest.json').version);fs.appendFileSync('.fixture-check-ran','checked\\n');console.log('offline fixture check-all passed');`
    );
    await writeFile(join(fixture, '.gitignore'), 'node_modules/\n.fixture-check-ran\n');
    const deny = join(fixture, 'scripts/deny-network.mjs');
    await writeFile(
      deny,
      `import net from 'node:net';net.Socket.prototype.connect=function(){throw new Error('network disabled in release fixture')};globalThis.fetch=async()=>{throw new Error('network disabled in release fixture')};`
    );
    const env = {
      ...process.env,
      CI: 'true',
      NO_UPDATE_NOTIFIER: '1',
      npm_config_offline: 'true',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_TERMINAL_PROMPT: '0',
      NODE_OPTIONS: `--import=${pathToFileURL(deny).href}`,
    };
    function git(args, cwd = fixture) {
      const result = spawnSync('git', args, {
        cwd,
        env,
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    }
    git(['init', '--bare', origin], temporary);
    git(['init']);
    git(['config', 'user.name', 'Fixture']);
    git(['config', 'user.email', 'fixture@example.invalid']);
    git(['config', 'commit.gpgsign', 'false']);
    git(['add', '.']);
    git(['commit', '-m', 'chore: seed offline fixture']);
    await writeFile(join(fixture, 'README.md'), 'Fixture compatibility fix.\n');
    git(['add', 'README.md']);
    git(['commit', '-m', 'fix: verify release tool compatibility']);
    git(['remote', 'add', 'origin', origin]);
    git(['push', '--set-upstream', 'origin', 'HEAD']);
    const beforeHead = git(['rev-parse', 'HEAD']),
      beforeRemote = git(['rev-parse', 'HEAD'], origin),
      beforeTags = git(['tag', '--list']);
    const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
    const fixtureFiles = [
      'package.json',
      'package-lock.json',
      'CHANGELOG.md',
      'chrome-extension/manifest.json',
    ];
    const before = await Promise.all(
      fixtureFiles.map(async (file) => hash(await readFile(join(fixture, file))))
    );
    const cli = join(root, 'node_modules/release-it/bin/release-it.js');
    function release(args) {
      const result = spawnSync(process.execPath, [cli, 'patch', '--ci', ...args], {
        cwd: fixture,
        env,
        encoding: 'utf8',
        timeout: 30000,
        killSignal: 'SIGKILL',
        maxBuffer: 1024 * 1024,
      });
      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      return result.stdout + result.stderr;
    }
    const preview = release(['--dry-run']);
    assert.match(preview, /1\.2\.1/);
    assert.match(preview, /scripts\/sync-version\.mjs/);
    assert.deepEqual(
      await Promise.all(
        fixtureFiles.map(async (file) => hash(await readFile(join(fixture, file))))
      ),
      before
    );
    // Exercise actual writes only in this disposable fixture, disabling every
    // Git publication action. The real repository/configuration is never changed.
    release(['--no-git.commit', '--no-git.tag', '--no-git.push']);
    const bumped = JSON.parse(await readFile(join(fixture, 'package.json'), 'utf8'));
    const lock = JSON.parse(await readFile(join(fixture, 'package-lock.json'), 'utf8'));
    const extension = JSON.parse(
      await readFile(join(fixture, 'chrome-extension/manifest.json'), 'utf8')
    );
    assert.equal(bumped.version, '1.2.1');
    assert.equal(lock.version, bumped.version);
    assert.equal(lock.packages[''].version, bumped.version);
    assert.equal(extension.version, bumped.version);
    assert.match(await readFile(join(fixture, 'CHANGELOG.md'), 'utf8'), /1\.2\.1/);
    assert.match(
      await readFile(join(fixture, 'CHANGELOG.md'), 'utf8'),
      /release tool compatibility/
    );
    assert.match(await readFile(join(fixture, '.fixture-check-ran'), 'utf8'), /checked/);
    assert.equal(git(['rev-parse', 'HEAD']), beforeHead);
    assert.equal(git(['rev-parse', 'HEAD'], origin), beforeRemote);
    assert.equal(git(['tag', '--list']), beforeTags);
    for (let i = 0; i < protectedFiles.length; i++)
      assert.deepEqual(
        await readFile(join(root, protectedFiles[i])),
        originals[i],
        `real repository changed: ${protectedFiles[i]}`
      );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
