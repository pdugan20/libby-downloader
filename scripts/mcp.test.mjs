import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../dist/mcp/server.js';

const root = fileURLToPath(new URL('..', import.meta.url));

test('stdio server initializes, lists tools, handles errors, and keeps stdout clean', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libby-mcp-protocol-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(root, 'dist/mcp.js'), '--data-dir', dataDir],
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', (data) => (stderr += data));
  const client = new Client({ name: 'libby-mcp-test', version: '1.0.0' });
  try {
    await client.connect(transport);
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
    assert.equal(client.getServerVersion().version, pkg.version);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [
      'download_loan',
      'get_job',
      'list_books',
      'merge_book',
      'tag_book',
    ]);
    const books = await client.callTool({ name: 'list_books', arguments: {} });
    assert.deepEqual(JSON.parse(books.content[0].text), []);
    const missing = await client.callTool({ name: 'get_job', arguments: { job_id: 'missing' } });
    assert.equal(missing.isError, true);
    const invalid = await client.callTool({
      name: 'download_loan',
      arguments: { loan_url: 'https://example.com/private?cmpt=secret' },
    });
    assert.equal(invalid.isError, true);
    assert.doesNotMatch(JSON.stringify(invalid), /secret|cmpt/);
    assert.equal(stderr, '');
  } finally {
    await client.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('tool dispatch rejects malformed arguments before invoking jobs', async () => {
  const calls = [];
  const jobs = {
    download: (...args) => {
      calls.push(args);
      return { id: 'job-1', state: 'running' };
    },
    close: () => {},
  };
  const server = createMcpServer('test-version', jobs);
  const client = new Client({ name: 'libby-dispatch-test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    for (const args of [
      {},
      { loan_url: 42 },
      { loan_url: 'test', tag: 'true' },
      { loan_url: 'test', data_dir: '/tmp' },
      { loan_url: '' },
    ]) {
      const result = await client.callTool({ name: 'download_loan', arguments: args });
      assert.equal(result.isError, true);
    }
    assert.equal(calls.length, 0);
    const result = await client.callTool({
      name: 'download_loan',
      arguments: { loan_url: 'https://libbyapp.com/open/loan/111/222', tag: true, merge: true },
    });
    assert.equal(result.isError, undefined);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0][1], { tag: true, merge: true, force: undefined });
  } finally {
    await client.close();
    await server.close();
  }
});

test('MCP jobs tag and merge synthetic audio through the actual media services', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libby-mcp-audio-'));
  const book = 'Synthetic Book (222)';
  const folder = path.join(dataDir, book);
  await fs.mkdir(folder);
  for (let chapter = 1; chapter <= 2; chapter++) {
    execFileSync(ffmpegInstaller.path, [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=1',
      '-c:a',
      'libmp3lame',
      path.join(folder, `chapter-00${chapter}.mp3`),
    ]);
  }
  await fs.writeFile(
    path.join(folder, 'metadata.json'),
    JSON.stringify({
      metadata: { title: 'Synthetic Book', authors: ['Fixture Author'] },
      chapters: [
        { index: 0, title: 'First', duration: 1 },
        { index: 1, title: 'Second', duration: 1 },
      ],
    })
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(root, 'dist/mcp.js'), '--data-dir', dataDir],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'libby-media-test', version: '1.0.0' });
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    assert.notEqual(result.isError, true, JSON.stringify(result));
    return JSON.parse(result.content[0].text);
  };
  const waitForJob = async (id) => {
    for (let i = 0; i < 1000; i++) {
      const job = await call('get_job', { job_id: id });
      if (job.state !== 'running') {
        assert.equal(job.state, 'completed', JSON.stringify(job));
        return job;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.fail('Media job timed out');
  };
  try {
    await client.connect(transport);
    assert.equal((await call('list_books', {}))[0].book, book);
    await waitForJob((await call('tag_book', { book })).id);
    assert.equal((await call('list_books', {}))[0].isTagged, true);
    const merged = await waitForJob((await call('merge_book', { book })).id);
    assert.equal(merged.outputFile, 'Synthetic Book.m4b');
    const output = path.join(folder, merged.outputFile);
    const probe = JSON.parse(
      execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_chapters', '-show_format', '-of', 'json', output],
        { encoding: 'utf8' }
      )
    );
    assert.equal(probe.chapters.length, 2);
    assert.equal(probe.format.tags.title, 'Synthetic Book');
    const original = await fs.readFile(output);
    const refused = await call('merge_book', { book });
    let result;
    for (let i = 0; i < 1000; i++) {
      result = await call('get_job', { job_id: refused.id });
      if (result.state !== 'running') break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(result.state, 'failed');
    assert.deepEqual(await fs.readFile(output), original);
  } finally {
    await client.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

async function withRawServer(dataDir, env, run) {
  const child = spawn(process.execPath, [path.join(root, 'dist/mcp.js'), '--data-dir', dataDir], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const exited = once(child, 'exit');
  const waiting = new Map();
  let nextId = 0;
  const lines = createInterface({ input: child.stdout });
  lines.on('line', (line) => {
    const message = JSON.parse(line);
    waiting.get(message.id)?.(message.result);
    waiting.delete(message.id);
  });
  const request = async (method, params) => {
    const id = ++nextId;
    const result = new Promise((resolve) => waiting.set(id, resolve));
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    return bounded(result, 'RPC response');
  };
  try {
    await request('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'shutdown-test', version: '1.0.0' },
    });
    child.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n'
    );
    await run(child, request, exited);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await exited;
    lines.close();
  }
}

async function bounded(promise, description) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${description} timed out`)), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

test('stdin EOF and SIGTERM abort a stalled cover fetch and exit without leaving media work', async () => {
  for (const mode of ['eof', 'signal']) {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libby-mcp-shutdown-'));
    const book = 'Stalled Cover (222)';
    let requested;
    const arrived = new Promise((resolve) => (requested = resolve));
    const http = createServer((_req, res) => {
      if (mode === 'signal') {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.write('incomplete body');
      }
      requested();
    });
    http.listen(0, '127.0.0.1');
    await once(http, 'listening');
    await fs.mkdir(path.join(dataDir, book));
    await fs.writeFile(
      path.join(dataDir, book, 'metadata.json'),
      JSON.stringify({
        metadata: {
          title: 'Stalled Cover',
          authors: ['Fixture Author'],
          coverUrl: `http://127.0.0.1:${http.address().port}/cover`,
        },
        chapters: [],
      })
    );
    try {
      await withRawServer(dataDir, {}, async (child, request, exited) => {
        await request('tools/call', { name: 'tag_book', arguments: { book } });
        await bounded(arrived, 'cover fetch');
        if (mode === 'eof') child.stdin.end();
        else child.kill('SIGTERM');
        assert.equal((await bounded(exited, 'server shutdown'))[0], 0);
      });
    } finally {
      http.closeAllConnections();
      await new Promise((resolve) => http.close(resolve));
      await fs.rm(dataDir, { recursive: true, force: true });
    }
  }
});

test('shutdown kills an in-flight ffprobe subprocess during merge preparation', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libby-mcp-probe-'));
  const book = 'Stalled Probe (222)';
  const pidFile = path.join(dataDir, 'probe.pid');
  const probe = path.join(dataDir, 'probe.cjs');
  await fs.writeFile(
    probe,
    `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));\nsetInterval(() => {}, 1000);\n`,
    { mode: 0o700 }
  );
  await fs.mkdir(path.join(dataDir, book));
  await fs.writeFile(path.join(dataDir, book, 'chapter-001.mp3'), 'fixture');
  await fs.writeFile(
    path.join(dataDir, book, 'metadata.json'),
    JSON.stringify({
      metadata: { title: 'Stalled Probe', authors: ['Fixture Author'] },
      chapters: [{ index: 0, title: 'First', duration: 1 }],
    })
  );
  let probePid;
  try {
    await withRawServer(dataDir, { FFPROBE_PATH: probe }, async (child, request, exited) => {
      await request('tools/call', { name: 'merge_book', arguments: { book } });
      await bounded(
        (async () => {
          for (let attempt = 0; attempt < 400; attempt++) {
            try {
              probePid = Number(await fs.readFile(pidFile, 'utf8'));
              return;
            } catch {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }
          throw new Error('ffprobe did not start');
        })(),
        'ffprobe start'
      );
      child.kill('SIGTERM');
      assert.equal((await bounded(exited, 'probe shutdown'))[0], 0);
      assert.throws(() => process.kill(probePid, 0), { code: 'ESRCH' });
    });
  } finally {
    if (probePid) {
      try {
        process.kill(probePid, 'SIGKILL');
      } catch {}
    }
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
