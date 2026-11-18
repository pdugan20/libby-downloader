import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test(
  'unmounting a waiting download stops polling and allows process exit',
  {
    skip: process.platform === 'win32' && 'uses Unix executable launcher fixtures',
  },
  async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'libby-cancel-'));
    const root = fileURLToPath(new URL('..', import.meta.url));
    const launcher = process.platform === 'darwin' ? 'open' : 'google-chrome';
    await fs.writeFile(
      path.join(directory, launcher),
      `#!${process.execPath}\nprocess.exit(0);\n`,
      {
        mode: 0o700,
      }
    );
    const source = `
    import React from 'react';
    import {render} from 'ink';
    import {PassThrough} from 'node:stream';
    import {DownloadProgress} from './dist/ui/ink/DownloadProgress.js';
    const stdout = new PassThrough();
    const stdin = new PassThrough();
    stdout.columns = 80;
    let stopped = false;
    const app = render(React.createElement(DownloadProgress, {
      loanUrl: 'https://libbyapp.com/open/loan/111/222',
      dataDir: ${JSON.stringify(directory)},
      onComplete: () => {},
    }), {stdout, stdin, stderr: stdout});
    stdout.on('data', chunk => {
      if (!stopped && chunk.toString().includes('Waiting for Libby')) {
        stopped = true;
        setTimeout(() => {app.unmount(); stdin.end(); console.log('unmounted');}, 50);
      }
    });
  `;
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
      cwd: root,
      env: { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}` },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    let timer;
    try {
      const result = await new Promise((resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Process did not exit after UI unmount: ${stdout} ${stderr}`)),
          3000
        );
        child.once('error', reject);
        child.once('exit', (code) => resolve(code));
      });
      assert.equal(result, 0, stderr);
      assert.match(stdout, /unmounted/);
    } finally {
      clearTimeout(timer);
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await fs.rm(directory, { recursive: true, force: true });
    }
  }
);
