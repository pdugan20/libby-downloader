import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger';

async function regularFileOrMissing(filePath: string) {
  try {
    const stat = await fs.lstat(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`Expected a regular file, not a symlink or directory: ${filePath}`);
    }
    return stat;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Book-folder children are regular files; never follow a chapter symlink outside it. */
export async function assertRegularChild(folderPath: string, filename: string): Promise<void> {
  if (path.basename(filename) !== filename) throw new Error('File is outside the selected folder');
  const root = await fs.realpath(folderPath);
  const child = path.join(root, filename);
  if (!(await regularFileOrMissing(child))) throw new Error(`File is missing: ${filename}`);
  const real = await fs.realpath(child);
  if (path.dirname(real) !== root) throw new Error('File is outside the selected folder');
}

/**
 * Stage on the destination filesystem, then atomically commit one complete file.
 * The selected directory is owner-controlled; this is not isolation from another
 * process concurrently replacing its parent directories. No-force uses link's
 * atomic no-clobber guarantee, even if a destination appears during encoding.
 */
export async function writeAtomicOutput(
  destination: string,
  write: (stagedPath: string) => Promise<void>,
  options: { overwrite: boolean; signal?: AbortSignal }
): Promise<number> {
  options.signal?.throwIfAborted();
  const parent = await fs.realpath(path.dirname(path.resolve(destination)));
  const target = path.join(parent, path.basename(destination));
  const existing = await regularFileOrMissing(target);
  const existsError = () =>
    new Error(
      `Output file already exists: ${path.basename(destination)} (use --force to overwrite)`
    );
  if (existing && !options.overwrite) throw existsError();
  const directory = await fs.mkdtemp(path.join(parent, '.libby-stage-'));
  const stagedPath = path.join(directory, path.basename(destination));
  try {
    options.signal?.throwIfAborted();
    await write(stagedPath);
    options.signal?.throwIfAborted();
    const staged = await regularFileOrMissing(stagedPath);
    if (!staged || staged.size === 0)
      throw new Error('Media tool did not produce a complete nonempty output');
    if (existing) await fs.chmod(stagedPath, existing.mode & 0o777);
    const handle = await fs.open(stagedPath, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    // Reject a pre-existing or newly introduced destination symlink. Atomic rename
    // replaces an entry, never follows it; the source is in our private directory.
    await regularFileOrMissing(target);
    options.signal?.throwIfAborted();
    if (options.overwrite) await fs.rename(stagedPath, target);
    else {
      try {
        await fs.link(stagedPath, target);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw existsError();
        throw error;
      }
    }
    return staged.size;
  } finally {
    // Cleanup failure must not report an already committed output as a failed write.
    await fs
      .rm(directory, { recursive: true, force: true })
      .catch(() => logger.debug('Could not remove media staging directory'));
  }
}
