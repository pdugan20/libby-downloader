/** @jest-environment node */
import { promises as fs } from 'node:fs';
import type { EventEmitter } from 'node:events';
import os from 'node:os';
import path from 'node:path';

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../mcp/jobs', () => ({
  DownloadJobs: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../mcp/server', () => ({
  createMcpServer: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('../../utils/logger', () => ({
  logger: { setLevel: jest.fn() },
  LogLevel: { SILENT: 4 },
}));

describe('MCP package version lookup', () => {
  const originalArgv = process.argv;
  let root: string;
  let restoreListeners: () => void;

  beforeEach(async () => {
    const subscriptions: Array<[EventEmitter, string]> = [
      [process, 'SIGINT'],
      [process, 'SIGTERM'],
      [process.stdin, 'end'],
      [process.stdin, 'close'],
    ];
    const snapshots = subscriptions.map(([emitter, event]) => new Set(emitter.listeners(event)));
    restoreListeners = () => {
      subscriptions.forEach(([emitter, event], index) => {
        for (const listener of emitter.listeners(event)) {
          if (!snapshots[index].has(listener)) {
            emitter.removeListener(event, listener as (...args: unknown[]) => void);
          }
        }
      });
    };
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'libby-version-'));
    for (const directory of ['src', 'dist', 'bin']) await fs.mkdir(path.join(root, directory));
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ version: '9.9.9' }));
    await fs.writeFile(path.join(root, 'src/mcp.ts'), '');
    await fs.writeFile(path.join(root, 'dist/mcp.js'), '');
    await fs.symlink(path.join(root, 'dist/mcp.js'), path.join(root, 'bin/libby-mcp'));
  });

  afterEach(async () => {
    process.argv = originalArgv;
    restoreListeners();
    await fs.rm(root, { recursive: true, force: true });
  });

  it.each(['src/mcp.ts', 'dist/mcp.js', 'bin/libby-mcp'])(
    'reads the owning package version for %s instead of the working directory',
    async (entry) => {
      process.argv = [process.execPath, path.join(root, entry)];
      await jest.isolateModulesAsync(async () => {
        const factory = jest.requireMock('../../mcp/server') as { createMcpServer: jest.Mock };
        await import('../../mcp');
        expect(factory.createMcpServer).toHaveBeenCalledWith('9.9.9', expect.any(Object));
      });
    }
  );
});
