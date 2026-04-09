import { useEffect, useState, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
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
  cancelled: boolean;
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MergeProgress({ folderPath, onComplete, onError }: MergeProgressProps) {
  const [state, setState] = useState<MergeState>({
    stage: 'Preparing...',
    timemark: '',
    totalDurationSecs: 0,
    chapterCount: 0,
    done: false,
    cancelled: false,
  });
  const startTimeRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  useInput((_input, key) => {
    if (key.escape && !state.done && !state.cancelled) {
      abortRef.current?.abort();
      setState((prev) => ({ ...prev, cancelled: true, done: true }));
    }
  });

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
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
        signal: controller.signal,
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          setTimeout(() => onComplete(), 1000);
          return;
        }
        setState((prev) => ({ ...prev, error: err.message, done: true }));
        onError?.(err);
      });

    return () => {
      controller.abort();
    };
  }, []);

  if (state.error) {
    return <Text color="red">Error: {state.error}</Text>;
  }

  if (state.cancelled) {
    return (
      <Box paddingLeft={2}>
        <Text color="yellow">Merge cancelled.</Text>
      </Box>
    );
  }

  if (state.done && state.outputFile) {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;

    return (
      <Box flexDirection="column" paddingLeft={2}>
        <Box>
          <Text color="green">✔</Text>
          <Text bold> Merge complete</Text>
        </Box>
        <Box flexDirection="column" paddingLeft={2} marginTop={1}>
          <Text>
            <Text dimColor>File: </Text>
            <Text color="cyan">{state.outputFile}</Text>
          </Text>
          <Text>
            <Text dimColor>Size: </Text>
            <Text>{formatFileSize(state.fileSize || 0)}</Text>
          </Text>
          <Text>
            <Text dimColor>Time: </Text>
            <Text>{formatDuration(elapsed)}</Text>
          </Text>
          <Text>
            <Text dimColor>Audio: </Text>
            <Text>{formatDuration(state.totalDurationSecs)}</Text>
            <Text dimColor> ({state.chapterCount} chapters)</Text>
          </Text>
        </Box>
      </Box>
    );
  }

  // During active merge with progress data
  if (state.totalDurationSecs > 0 && state.timemark) {
    const processedSecs = parseTimemark(state.timemark);
    const percent = Math.min(processedSecs / state.totalDurationSecs, 1);
    const percentDisplay = Math.round(percent * 100);

    // Calculate ETA and speed from wall-clock encoding time
    let etaStr = '';
    let speedStr = '';
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    if (elapsed > 2 && processedSecs > 0) {
      const speed = processedSecs / elapsed;
      speedStr = `${speed.toFixed(1)}x`;
      const remaining = (state.totalDurationSecs - processedSecs) / speed;
      if (remaining > 0) {
        etaStr = formatEta(remaining);
      }
    }

    // Estimate current chapter based on linear progress through total duration
    const estChapter = Math.min(
      Math.ceil((processedSecs / state.totalDurationSecs) * state.chapterCount),
      state.chapterCount
    );

    return (
      <Box flexDirection="column" paddingLeft={2}>
        <Box>
          <ProgressBar current={percentDisplay} total={100} width={24} showPercent />
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text>
            <Text dimColor>
              {formatDuration(processedSecs)} / {formatDuration(state.totalDurationSecs)}
            </Text>
            <Text dimColor> Ch. </Text>
            <Text>{estChapter}</Text>
            <Text dimColor>/{state.chapterCount}</Text>
          </Text>
          <Text>
            <Text dimColor>Speed: {speedStr || '---'} </Text>
            <Text dimColor>ETA: </Text>
            {etaStr ? (
              <Text bold color="cyan">
                ~{etaStr}
              </Text>
            ) : (
              <Text dimColor>---</Text>
            )}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Pre-merge stages (loading metadata, finding chapters, etc.)
  return (
    <Box paddingLeft={2}>
      <Text color="cyan">
        <Spinner type="dots" />
      </Text>
      <Text dimColor> {state.stage}</Text>
    </Box>
  );
}
