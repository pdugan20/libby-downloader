import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { DownloadJobs } from './jobs';

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const schema = (
  properties: Record<string, object>,
  required: string[] = []
): Tool['inputSchema'] => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const book = { type: 'string', description: 'Exact book folder name returned by list_books' };
const force = { type: 'boolean', description: 'Replace this book’s existing M4B (default false)' };

export const TOOLS: Tool[] = [
  {
    name: 'list_books',
    description:
      'List downloaded books and their tagging/merge status in the configured directory.',
    inputSchema: schema({}),
    annotations: readOnly,
  },
  {
    name: 'download_loan',
    description:
      'Start downloading an active Libby audiobook loan through the signed-in Google Chrome and installed Libby Downloader extension. Returns a job ID; poll get_job every few seconds. Optional tag and merge run after all chapters arrive. Requires Chrome; does not use a headless browser or borrow books.',
    inputSchema: schema(
      {
        loan_url: {
          type: 'string',
          description: 'https://libbyapp.com/open/loan/<card-id>/<title-id>',
        },
        tag: { type: 'boolean' },
        merge: { type: 'boolean' },
        force,
      },
      ['loan_url']
    ),
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  },
  {
    name: 'tag_book',
    description: 'Start tagging a downloaded book’s MP3 files. Returns a job ID; poll get_job.',
    inputSchema: schema({ book }, ['book']),
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  },
  {
    name: 'merge_book',
    description:
      'Start merging a downloaded book into an M4B. Keeps existing output unless force is true. Returns a job ID; poll get_job.',
    inputSchema: schema({ book, force }, ['book']),
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  },
  {
    name: 'get_job',
    description:
      'Read job progress or its final result. Jobs live in memory until server shutdown; the latest 50 are retained. Only one mutation job runs at a time.',
    inputSchema: schema({ job_id: { type: 'string' } }, ['job_id']),
    annotations: readOnly,
  },
];

/** Also validate at dispatch: the low-level SDK does not validate tool arguments. */
function validate(name: string, args: Record<string, unknown>): void {
  const tool = TOOLS.find((candidate) => candidate.name === name);
  if (!tool) throw new Error('Unknown tool.');
  for (const required of tool.inputSchema.required ?? []) {
    if (!(required in args)) throw new Error(`Missing argument: ${required}`);
  }
  for (const [key, value] of Object.entries(args)) {
    const property = tool.inputSchema.properties?.[key] as { type?: string } | undefined;
    if (!property) throw new Error('Unexpected argument.');
    if (typeof value !== property.type) throw new Error(`Invalid argument type: ${key}`);
    if (typeof value === 'string' && (!value.trim() || value.length > 2048)) {
      throw new Error(`Invalid argument length: ${key}`);
    }
  }
}

export function createMcpServer(version: string, jobs = new DownloadJobs()): Server {
  const server = new Server(
    { name: 'libby-downloader', version },
    {
      capabilities: { tools: {} },
      instructions:
        'Use list_books for exact local book names. Mutation tools return immediately with a job ID; poll get_job until completed or failed. Downloading requires the user’s signed-in Chrome and extension on this computer. Never request library credentials through these tools.',
    }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      validate(name, args);
      let result: unknown;
      switch (name) {
        case 'list_books':
          result = await jobs.listBooks();
          break;
        case 'get_job':
          result = jobs.status(args.job_id as string);
          break;
        case 'download_loan':
          result = jobs.download(args.loan_url as string, {
            tag: args.tag as boolean | undefined,
            merge: args.merge as boolean | undefined,
            force: args.force as boolean | undefined,
          });
          break;
        case 'tag_book':
          result = await jobs.tag(args.book as string);
          break;
        case 'merge_book':
          result = await jobs.merge(args.book as string, args.force as boolean | undefined);
          break;
      }
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      // Only messages deliberately produced by the tool layer reach this boundary.
      return {
        isError: true,
        content: [{ type: 'text', text: error instanceof Error ? error.message : 'Tool failed.' }],
      };
    }
  });
  server.onclose = () => jobs.close();
  return server;
}
