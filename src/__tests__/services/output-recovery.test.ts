/** @jest-environment node */
import { promises as fs, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import NodeID3 from 'node-id3';
import { MetadataService } from '../../services/metadata-service';
import { MergeService } from '../../services/merge-service';

jest.mock('node-id3', () => ({
  __esModule: true,
  default: { write: jest.fn(), removeTags: jest.fn() },
}));
const tags = { title: 'Fixture chapter', artist: 'Fixture author', album: 'Fixture book' };
let root: string;
let chapter: string;
let output: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(tmpdir(), 'libby-output-test-'));
  chapter = path.join(root, 'chapter-1.mp3');
  output = path.join(root, 'Fixture book.m4b');
  await fs.writeFile(chapter, 'original chapter');
  await fs.writeFile(output, 'previous merge');
  await fs.writeFile(
    path.join(root, 'metadata.json'),
    JSON.stringify({
      metadata: { title: 'Fixture book', authors: ['Fixture author'] },
      chapters: [{ index: 0, title: 'Fixture chapter', duration: 1 }],
    })
  );
  jest.mocked(NodeID3.write).mockReset();
});
afterEach(async () => {
  jest.restoreAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});

type MergeInternals = {
  getAudioDuration: (filePath: string) => Promise<number>;
  executeMerge: (
    concat: string,
    metadata: string,
    cover: string | null,
    destination: string,
    onProgress?: (time: string) => void,
    signal?: AbortSignal
  ) => Promise<void>;
};
function merger() {
  const service = new MergeService();
  const internals = service as unknown as MergeInternals;
  jest.spyOn(internals, 'getAudioDuration').mockResolvedValue(1);
  return { service, run: jest.spyOn(internals, 'executeMerge') };
}

async function createLinkFixture(link: string, filename: string): Promise<string> {
  const directory = path.join(root, `outside-${filename}`);
  await fs.mkdir(directory);
  const outside = path.join(directory, filename);
  await fs.writeFile(outside, 'outside original');
  await fs.unlink(link);
  // Junctions exercise real link rejection on Windows without symlink privileges.
  // Unix also exercises file symlinks, which Windows requires extra privileges for.
  await fs.symlink(
    process.platform === 'win32' ? directory : outside,
    link,
    process.platform === 'win32' ? 'junction' : 'file'
  );
  return outside;
}
it('preserves the original when ID3 partially writes and returns false', async () => {
  jest.mocked(NodeID3.write).mockImplementation((_tags, destination) => {
    writeFileSync(destination as string, 'damaged partial tag');
    return false;
  });
  await expect(new MetadataService().embedToFile(chapter, tags)).rejects.toThrow();
  expect(await fs.readFile(chapter, 'utf8')).toBe('original chapter');
});
it('preserves the previous forced merge and chapters after partial FFmpeg failure', async () => {
  const { service, run } = merger();
  run.mockImplementation(async (_concat, _metadata, _cover, destination) => {
    await fs.writeFile(destination, 'partial new merge');
    throw new Error('encoder failed');
  });
  await expect(service.mergeFolder(root, { force: true })).rejects.toThrow('encoder failed');
  expect(await fs.readFile(output, 'utf8')).toBe('previous merge');
  expect(await fs.readFile(chapter, 'utf8')).toBe('original chapter');
});
it('preserves the previous forced merge when cancellation arrives after encoding', async () => {
  const { service, run } = merger();
  const ctrl = new AbortController();
  run.mockImplementation(async (_concat, _metadata, _cover, destination) => {
    await fs.writeFile(destination, 'new merge');
    ctrl.abort(new Error('cancelled'));
  });
  await expect(service.mergeFolder(root, { force: true, signal: ctrl.signal })).rejects.toThrow(
    /cancel/i
  );
  expect(await fs.readFile(output, 'utf8')).toBe('previous merge');
});

it('only replaces a forced destination after a complete successful encode', async () => {
  const { service, run } = merger();
  run.mockImplementation(async (_concat, _metadata, _cover, destination) => {
    expect(destination).not.toBe(output);
    expect(path.dirname(path.dirname(destination))).toBe(await fs.realpath(root));
    expect(await fs.readFile(output, 'utf8')).toBe('previous merge');
    await fs.writeFile(destination, 'complete new merge');
  });
  const result = await service.mergeFolder(root, { force: true });
  expect(result.fileSize).toBe(Buffer.byteLength('complete new merge'));
  expect(await fs.readFile(output, 'utf8')).toBe('complete new merge');
  expect(await fs.readFile(chapter, 'utf8')).toBe('original chapter');
  expect((await fs.readdir(root)).filter((file) => file.startsWith('.libby-stage-'))).toEqual([]);
});
it('never overwrites an existing destination without force', async () => {
  const { service, run } = merger();
  await expect(service.mergeFolder(root)).rejects.toThrow(/already exists/);
  expect(run).not.toHaveBeenCalled();
  expect(await fs.readFile(output, 'utf8')).toBe('previous merge');
});
it('atomically refuses a destination that appears during a no-force merge', async () => {
  await fs.unlink(output);
  const { service, run } = merger();
  run.mockImplementation(async (_concat, _metadata, _cover, destination) => {
    await fs.writeFile(destination, 'new staged merge');
    await fs.writeFile(output, 'concurrent destination');
  });
  await expect(service.mergeFolder(root)).rejects.toThrow(/already exists/);
  expect(await fs.readFile(output, 'utf8')).toBe('concurrent destination');
});
it('leaves no new final output after a failed first merge', async () => {
  await fs.unlink(output);
  const { service, run } = merger();
  run.mockImplementation(async (_concat, _metadata, _cover, destination) => {
    await fs.writeFile(destination, 'partial');
    throw new Error('failed');
  });
  await expect(service.mergeFolder(root)).rejects.toThrow('failed');
  await expect(fs.lstat(output)).rejects.toMatchObject({ code: 'ENOENT' });
  expect((await fs.readdir(root)).filter((file) => file.startsWith('.libby-stage-'))).toEqual([]);
});
it('rejects a forced destination symlink and never touches its target', async () => {
  const outside = await createLinkFixture(output, 'outside.m4b');
  const { service, run } = merger();
  await expect(service.mergeFolder(root, { force: true })).rejects.toThrow(/symlink/);
  expect(run).not.toHaveBeenCalled();
  expect(await fs.readFile(outside, 'utf8')).toBe('outside original');
  expect((await fs.lstat(output)).isSymbolicLink()).toBe(true);
});
it('rejects chapter symlinks before probing or encoding', async () => {
  const outside = await createLinkFixture(chapter, 'outside.mp3');
  const { service, run } = merger();
  await expect(service.mergeFolder(root, { force: true })).rejects.toThrow(/symlink/);
  expect(run).not.toHaveBeenCalled();
  expect(await fs.readFile(outside, 'utf8')).toBe('outside original');
});
it('preserves tag input on thrown errors, returned Error values and cancellation', async () => {
  for (const mode of ['throw', 'error', 'cancel']) {
    const ctrl = new AbortController();
    jest.mocked(NodeID3.write).mockImplementation((_tags, destination) => {
      writeFileSync(destination as string, 'partial staged tags');
      if (mode === 'throw') throw new Error('tagging failed');
      if (mode === 'error') return new Error('tagging failed');
      ctrl.abort(new Error('tagging cancelled'));
      return true;
    });
    await expect(
      new MetadataService().embedToFile(chapter, tags, { signal: ctrl.signal })
    ).rejects.toThrow();
    expect(await fs.readFile(chapter, 'utf8')).toBe('original chapter');
  }
  expect((await fs.readdir(root)).filter((file) => file.startsWith('.libby-stage-'))).toEqual([]);
});
it('commits successful tags only after staging and preserves the supported file mode', async () => {
  await fs.chmod(chapter, 0o600);
  const originalMode = (await fs.stat(chapter)).mode & 0o777;
  // Windows chmod supports a subset of Unix permissions; keep the strict Unix check.
  if (process.platform !== 'win32') expect(originalMode).toBe(0o600);
  jest.mocked(NodeID3.write).mockImplementation((_tags, destination) => {
    expect(destination).not.toBe(chapter);
    expect(readFileSync(chapter, 'utf8')).toBe('original chapter');
    writeFileSync(destination as string, 'tag:' + readFileSync(destination as string, 'utf8'));
    return true;
  });
  await new MetadataService().embedToFile(chapter, tags);
  expect(await fs.readFile(chapter, 'utf8')).toBe('tag:original chapter');
  expect((await fs.stat(chapter)).mode & 0o777).toBe(originalMode);
});
it('preserves both originals if the final rename fails', async () => {
  jest
    .spyOn(fs, 'rename')
    .mockRejectedValueOnce(Object.assign(new Error('rename denied'), { code: 'EACCES' }));
  const { service, run } = merger();
  run.mockImplementation(async (_concat, _metadata, _cover, destination) => {
    await fs.writeFile(destination, 'complete new merge');
  });
  await expect(service.mergeFolder(root, { force: true })).rejects.toThrow('rename denied');
  expect(await fs.readFile(output, 'utf8')).toBe('previous merge');
  expect(await fs.readFile(chapter, 'utf8')).toBe('original chapter');
});
it('does not encode when already cancelled or publish empty encoder output', async () => {
  const { service, run } = merger();
  const ctrl = new AbortController();
  ctrl.abort(new Error('cancelled'));
  await expect(service.mergeFolder(root, { force: true, signal: ctrl.signal })).rejects.toThrow(
    'cancelled'
  );
  expect(run).not.toHaveBeenCalled();
  run.mockImplementation(async (_concat, _metadata, _cover, destination) => {
    await fs.writeFile(destination, '');
  });
  await expect(service.mergeFolder(root, { force: true })).rejects.toThrow(/nonempty/);
  expect(await fs.readFile(output, 'utf8')).toBe('previous merge');
});
it('does not report a committed merge as failed when the completion callback throws', async () => {
  const { service, run } = merger();
  run.mockImplementation(async (_concat, _metadata, _cover, destination) => {
    await fs.writeFile(destination, 'complete new merge');
  });
  await expect(
    service.mergeFolder(root, {
      force: true,
      onComplete: () => {
        throw new Error('UI callback failed');
      },
    })
  ).resolves.toMatchObject({ outputPath: output });
  expect(await fs.readFile(output, 'utf8')).toBe('complete new merge');
});

it('preserves the original if ID3 removal partially writes and fails', async () => {
  jest.mocked(NodeID3.removeTags).mockImplementation((destination) => {
    writeFileSync(destination as string, 'partial removed tags');
    return false;
  });
  await expect(new MetadataService().removeMetadata(chapter)).rejects.toThrow(/remove/);
  expect(await fs.readFile(chapter, 'utf8')).toBe('original chapter');
});
