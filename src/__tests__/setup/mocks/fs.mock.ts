/**
 * Mock implementation of fs promises for testing
 */

export const createFsMock = () => {
  const files = new Map<string, string>();
  const directories = new Set<string>();

  const readFileMock = jest.fn((path: string) => {
    if (files.has(path)) {
      return Promise.resolve(files.get(path));
    }
    return Promise.reject(new Error(`ENOENT: no such file or directory, open '${path}'`));
  });

  const writeFileMock = jest.fn((path: string, content: string) => {
    files.set(path, content);
    return Promise.resolve();
  });

  const readdirMock = jest.fn((path: string, options?: any) => {
    const pathEntries: any[] = [];

    // Get files in this directory
    files.forEach((_, filePath) => {
      if (filePath.startsWith(path + '/')) {
        const relativePath = filePath.slice(path.length + 1);
        if (!relativePath.includes('/')) {
          pathEntries.push(
            options?.withFileTypes
              ? { name: relativePath, isDirectory: () => false, isFile: () => true }
              : relativePath
          );
        }
      }
    });

    // Get subdirectories
    directories.forEach((dirPath) => {
      if (dirPath.startsWith(path + '/')) {
        const relativePath = dirPath.slice(path.length + 1);
        if (!relativePath.includes('/')) {
          pathEntries.push(
            options?.withFileTypes
              ? { name: relativePath, isDirectory: () => true, isFile: () => false }
              : relativePath
          );
        }
      }
    });

    return Promise.resolve(pathEntries);
  });

  const accessMock = jest.fn((path: string) => {
    if (files.has(path) || directories.has(path)) {
      return Promise.resolve();
    }
    return Promise.reject(new Error(`ENOENT: no such file or directory, access '${path}'`));
  });

  const statMock = jest.fn((path: string) => {
    if (files.has(path)) {
      return Promise.resolve({
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-01'),
      });
    }
    if (directories.has(path)) {
      return Promise.resolve({
        isDirectory: () => true,
        isFile: () => false,
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-01'),
      });
    }
    return Promise.reject(new Error(`ENOENT: no such file or directory, stat '${path}'`));
  });

  return {
    promises: {
      readFile: readFileMock,
      writeFile: writeFileMock,
      readdir: readdirMock,
      access: accessMock,
      stat: statMock,
    },
    // Helper methods for testing
    addFile: (path: string, content: string) => {
      files.set(path, content);
    },
    addDirectory: (path: string) => {
      directories.add(path);
    },
    clear: () => {
      files.clear();
      directories.clear();
      readFileMock.mockClear();
      writeFileMock.mockClear();
      readdirMock.mockClear();
      accessMock.mockClear();
      statMock.mockClear();
    },
  };
};

// Export default mock
export default createFsMock();
