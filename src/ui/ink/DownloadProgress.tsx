import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import {
  autostartUrl,
  LoanDownloadService,
  loanTitleId,
  openInChrome,
  type DownloadedBook,
} from '../../services/loan-download-service';
import { TagProgress } from './TagProgress';
import { MergeProgress } from './MergeProgress';

interface DownloadProgressProps {
  loanUrl: string;
  dataDir?: string;
  tag?: boolean;
  merge?: boolean;
  force?: boolean;
  onComplete: () => void;
  onError?: (error: Error) => void;
}

type Stage = 'opening' | 'waiting' | 'downloading' | 'tagging' | 'merging' | 'done';

export function DownloadProgress({
  loanUrl,
  dataDir,
  tag,
  merge,
  force,
  onComplete,
  onError,
}: DownloadProgressProps) {
  const [stage, setStage] = useState<Stage>('opening');
  const [folder, setFolder] = useState<string>();
  const [chapters, setChapters] = useState(0);
  const [book, setBook] = useState<DownloadedBook>();
  const [error, setError] = useState<string>();

  const fail = (err: Error): void => {
    setError(err.message);
    onError?.(err);
  };

  const afterTag = (): void => {
    if (merge) {
      setStage('merging');
    } else {
      setStage('done');
      onComplete();
    }
  };

  useEffect(() => {
    const startedAt = Date.now();
    const service = new LoanDownloadService(dataDir);

    openInChrome(autostartUrl(loanUrl))
      .then(() => {
        setStage('waiting');
        return service.waitForBook({
          startedAt,
          titleId: loanTitleId(loanUrl),
          onProgress: (progress) => {
            setFolder(progress.folder);
            setChapters(progress.chapters);
            setStage('downloading');
          },
        });
      })
      .then((downloaded) => {
        setBook(downloaded);
        if (downloaded.missingChapters.length > 0) {
          throw new Error(
            `${downloaded.missingChapters.length} of ${downloaded.chapterCount} chapters didn't download (${downloaded.missingChapters.join(', ')}). Run libby download again.`
          );
        }
        if (tag) {
          setStage('tagging');
        } else {
          afterTag();
        }
      })
      .catch(fail);
  }, []);

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  const downloadedLine = book && (
    <Text>
      <Text color="green">✔</Text> Downloaded <Text bold>{book.title}</Text>{' '}
      <Text dimColor>({book.chapterCount} chapters)</Text>
    </Text>
  );

  if (stage === 'tagging' && book) {
    return (
      <Box flexDirection="column">
        {downloadedLine}
        <TagProgress folderPath={book.folderPath} onComplete={afterTag} onError={fail} />
      </Box>
    );
  }

  if (stage === 'merging' && book) {
    return (
      <Box flexDirection="column">
        {downloadedLine}
        <MergeProgress
          folderPath={book.folderPath}
          force={force}
          onComplete={() => {
            setStage('done');
            onComplete();
          }}
          onError={fail}
        />
      </Box>
    );
  }

  if (stage === 'done' && book) {
    return (
      <Box flexDirection="column">
        {downloadedLine}
        <Text dimColor>{book.folderPath}</Text>
      </Box>
    );
  }

  const status =
    stage === 'opening'
      ? 'Opening the loan in Chrome'
      : stage === 'waiting'
        ? 'Waiting for Libby to start the download'
        : `Downloading ${folder} · ${chapters} chapters`;

  return (
    <Text>
      <Text color="cyan">
        <Spinner type="dots" />
      </Text>{' '}
      {status}
    </Text>
  );
}
