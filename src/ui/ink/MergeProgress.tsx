import { useEffect, useState, useRef } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { MergeService } from '../../services/merge-service';
import { ProgressBar } from './ProgressBar';

interface MergeProgressProps {
  folderPath: string;
  onComplete: () => void;
  onError?: (error: Error) => void;
}

interface MergeState {
  stage: string;
  timemark: string;
  totalDurationSecs: number;
  chapterCount: number;
  done: boolean;
  outputFile?: string;
  fileSize?: number;
  error?: string;
}

function parseTimemark(timemark: string): number {
  const parts = timemark.split(':');
  if (parts.length !== 3) return 0;
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(totalSecs: number): string {
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = Math.floor(totalSecs % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function MergeProgress({ folderPath, onComplete, onError }: MergeProgressProps) {
  const [state, setState] = useState<MergeState>({
    stage: 'Preparing...',
    timemark: '',
    totalDurationSecs: 0,
    chapterCount: 0,
    done: false,
  });
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const service = new MergeService();
    service
      .mergeFolder(folderPath, {
        onStageChange: (stage) => {
          setState((prev) => ({ ...prev, stage }));
        },
        onMergeStart: (totalDurationSecs, chapterCount) => {
          startTimeRef.current = Date.now();
          setState((prev) => ({ ...prev, totalDurationSecs, chapterCount }));
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

  // During active merge with progress data
  if (state.totalDurationSecs > 0 && state.timemark) {
    const processedSecs = parseTimemark(state.timemark);
    const percent = Math.min(processedSecs / state.totalDurationSecs, 1);
    const percentDisplay = Math.round(percent * 100);

    // Calculate ETA from wall-clock encoding speed
    let etaStr = '';
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    if (elapsed > 2 && processedSecs > 0) {
      const speed = processedSecs / elapsed;
      const remaining = (state.totalDurationSecs - processedSecs) / speed;
      if (remaining > 0) {
        etaStr = formatEta(remaining);
      }
    }

    return (
      <Box flexDirection="column">
        <Box>
          <ProgressBar current={percentDisplay} total={100} width={24} showPercent />
        </Box>
        <Box paddingLeft={2} marginTop={1}>
          <Text dimColor>
            {formatDuration(processedSecs)} / {formatDuration(state.totalDurationSecs)}
          </Text>
          {etaStr && <Text dimColor> ETA: ~{etaStr}</Text>}
        </Box>
      </Box>
    );
  }

  // Pre-merge stages (loading metadata, finding chapters, etc.)
  return (
    <Box>
      <Text>
        <Spinner type="dots" />
      </Text>
      <Text> {state.stage}</Text>
    </Box>
  );
}
