import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { MetadataService, EmbedOptions } from '../../services/metadata-service';
import { ProgressBar } from './ProgressBar';

interface TagProgressProps {
  folderPath: string;
  options?: EmbedOptions;
  onComplete: () => void;
  onError?: (error: Error) => void;
}

interface TagState {
  currentFile: string;
  current: number;
  total: number;
  done: boolean;
  error?: string;
}

export function TagProgress({ folderPath, options = {}, onComplete, onError }: TagProgressProps) {
  const [state, setState] = useState<TagState>({
    currentFile: '',
    current: 0,
    total: 0,
    done: false,
  });

  useEffect(() => {
    const service = new MetadataService();
    service
      .embedToFolder(folderPath, options, {
        onFileStart: (filename, current, total) => {
          setState({ currentFile: filename, current, total, done: false });
        },
        onComplete: (totalFiles) => {
          setState((prev) => ({ ...prev, current: totalFiles, done: true }));
          setTimeout(() => onComplete(), 2000);
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

  if (state.done) {
    return (
      <Text>
        <Text color="green">✔</Text> Tagged {state.total} files
      </Text>
    );
  }

  if (state.total === 0) {
    return (
      <Box>
        <Text>
          <Spinner type="dots" />
        </Text>
        <Text> Preparing...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text>
          <Spinner type="dots" />
        </Text>
        <Text> Tagging {state.currentFile}</Text>
      </Box>
      <Box paddingLeft={2}>
        <ProgressBar current={state.current} total={state.total} />
      </Box>
    </Box>
  );
}
