/** @jest-environment node */
import type { DownloadJobs } from '../../mcp/jobs';
import { createMcpServer, TOOLS } from '../../mcp/server';

type Result = { content: Array<{ text: string }>; isError?: boolean };
type Handler = (request: {
  params: { name: string; arguments?: Record<string, unknown> };
}) => Promise<Result>;
interface Harness {
  handlers: Map<string, Handler>;
  onclose: () => void;
}

// Capture the SDK boundary; the actual transport is exercised in scripts/mcp.test.mjs.
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: class {
    handlers = new Map<string, Handler>();
    setRequestHandler(schema: string, handler: Handler) {
      this.handlers.set(schema, handler);
    }
  },
}));
jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: 'list',
  CallToolRequestSchema: 'call',
}));

describe('MCP tool boundary', () => {
  const job = { id: 'job-id', state: 'running' };
  let jobs: {
    listBooks: jest.Mock;
    status: jest.Mock;
    download: jest.Mock;
    tag: jest.Mock;
    merge: jest.Mock;
    close: jest.Mock;
  };
  let server: Harness;
  let call: (name: string, args?: Record<string, unknown>) => Promise<Result>;

  beforeEach(() => {
    jobs = {
      listBooks: jest.fn().mockResolvedValue([{ book: 'Book (222)' }]),
      status: jest.fn().mockReturnValue(job),
      download: jest.fn().mockReturnValue(job),
      tag: jest.fn().mockResolvedValue(job),
      merge: jest.fn().mockResolvedValue(job),
      close: jest.fn(),
    };
    server = createMcpServer(jobs as unknown as DownloadJobs) as unknown as Harness;
    call = (name, args) => server.handlers.get('call')!({ params: { name, arguments: args } });
  });

  it('advertises the same tools supported by dispatch and closes jobs with the connection', async () => {
    const list = server.handlers.get('list') as unknown as () => Promise<{ tools: typeof TOOLS }>;
    expect((await list()).tools.map(({ name }) => name)).toEqual([
      'list_books',
      'download_loan',
      'tag_book',
      'merge_book',
      'get_job',
    ]);
    server.onclose();
    expect(jobs.close).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['download_loan', {}],
    ['download_loan', { loan_url: 'loan', tag: 'true' }],
    ['download_loan', { loan_url: 'loan', force: 1 }],
    ['list_books', { unexpected: 'private-value' }],
    ['get_job', { job_id: '   ' }],
    ['get_job', { job_id: 'x'.repeat(2049) }],
    ['not_a_tool', {}],
  ] as Array<[string, Record<string, unknown>]>)(
    'rejects invalid %s input before any job runs',
    async (name, args) => {
      const result = await call(name, args);
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result)).not.toContain('private-value');
      for (const method of [jobs.listBooks, jobs.status, jobs.download, jobs.tag, jobs.merge]) {
        expect(method).not.toHaveBeenCalled();
      }
    }
  );

  it('lists books without requiring arguments', async () => {
    const result = await call('list_books');
    expect(JSON.parse(result.content[0].text)).toEqual([{ book: 'Book (222)' }]);
    expect(jobs.listBooks).toHaveBeenCalledTimes(1);
  });

  it('passes download options through and returns a job ID', async () => {
    const loan = 'https://libbyapp.com/open/loan/111/222';
    const result = await call('download_loan', {
      loan_url: loan,
      tag: true,
      merge: true,
      force: false,
    });
    expect(jobs.download).toHaveBeenCalledWith(loan, { tag: true, merge: true, force: false });
    expect(JSON.parse(result.content[0].text)).toEqual(job);
  });

  it('dispatches exact book names to tagging and merging', async () => {
    await call('tag_book', { book: 'Book (222)' });
    await call('merge_book', { book: 'Book (222)', force: true });
    expect(jobs.tag).toHaveBeenCalledWith('Book (222)');
    expect(jobs.merge).toHaveBeenCalledWith('Book (222)', true);
  });

  it('reads job status and reports deliberate job-layer failures as tool errors', async () => {
    expect(JSON.parse((await call('get_job', { job_id: 'job-id' })).content[0].text)).toEqual(job);
    expect(jobs.status).toHaveBeenCalledWith('job-id');
    jobs.status.mockImplementation(() => {
      throw new Error('Unknown job ID.');
    });
    const failure = await call('get_job', { job_id: 'missing' });
    expect(failure).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'Unknown job ID.' }],
    });
  });
});
