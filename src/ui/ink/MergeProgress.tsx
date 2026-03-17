import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { MergeService } from '../../services/merge-service';

interface MergeProgressProps {
  folderPath: string;
  onComplete: () => void;
  onError?: (error: Error) => void;
}

interface MergeState {
  stage: string;
  timemark: string;
  done: boolean;
  outputFile?: string;
  fileSize?: number;
  error?: string;
}

export function MergeProgress({ folderPath, onComplete, onError }: MergeProgressProps) {
  const [state, setState] = useState<MergeState>({
    stage: 'Preparing...',
    timemark: '',
    done: false,
  });

  useEffect(() => {
    const service = new MergeService();
    service
      .mergeFolder(folderPath, {
        onStageChange: (stage) => {
          setState((prev) => ({ ...prev, stage }));
        },
        onMergeProgress: (timemark) => {
          setState((prev) => ({ ...prev, timemark }));
        },
        onComplete: (filename, fileSize) => {
          setState((prev) => ({
            ...prev,
            done: true,
            outputFile: filename,
            fileSize,
          }));
          setTimeout(() => onComplete(), 100);
        },
      })
      .catch((err) => {
        setState((prev) => ({ ...prev, error: err.message, done: true }));
        onError?.(err);
      });
  }, []);

  if (state.error) {
    return <Text color="red">Error: {state.error}</Text>;
  }

  if (state.done && state.outputFile) {
    const sizeStr =
      (state.fileSize || 0) < 1024 * 1024
        ? `${((state.fileSize || 0) / 1024).toFixed(0)} KB`
        : `${((state.fileSize || 0) / 1024 / 1024).toFixed(1)} MB`;

    return (
      <Text>
        <Text color="green">✔</Text> Created <Text color="cyan">{state.outputFile}</Text> ({sizeStr}
        )
      </Text>
    );
  }

  return (
    <Box>
      <Text>
        <Spinner type="dots" />
      </Text>
      <Text>
        {' '}
        {state.stage}
        {state.timemark ? ` (${state.timemark})` : ''}
      </Text>
    </Box>
  );
}
