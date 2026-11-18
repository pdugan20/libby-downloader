#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DownloadJobs } from './mcp/jobs';
import { createMcpServer } from './mcp/server';
import { logger, LogLevel } from './utils/logger';

// stdout belongs exclusively to JSON-RPC. Suppress service logs, including raw errors.
logger.setLevel(LogLevel.SILENT);
const args = process.argv.slice(2);
if (args.length !== 0 && !(args.length === 2 && args[0] === '--data-dir' && args[1])) {
  process.stderr.write('Usage: libby-mcp [--data-dir <path>]\n');
  process.exitCode = 2;
} else {
  const server = createMcpServer(new DownloadJobs(args[1]));
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    void server.close();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  process.stdin.once('end', stop);
  process.stdin.once('close', stop);
  server.connect(new StdioServerTransport()).catch(() => {
    process.stderr.write('Could not start the Libby MCP server.\n');
    process.exitCode = 1;
  });
}
