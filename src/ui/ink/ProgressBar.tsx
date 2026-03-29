import { Text } from 'ink';

interface ProgressBarProps {
  current: number;
  total: number;
  width?: number;
  showPercent?: boolean;
}

export function ProgressBar({ current, total, width = 20, showPercent = false }: ProgressBarProps) {
  const percent = total > 0 ? Math.min(current / total, 1) : 0;
  const filled = Math.round(percent * width);
  const empty = width - filled;

  return (
    <Text>
      <Text color="white">{'▓'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text>{'  '}</Text>
      {showPercent ? (
        <Text bold>{Math.round(percent * 100)}%</Text>
      ) : (
        <>
          <Text bold>{current}</Text>
          <Text dimColor>/{total}</Text>
        </>
      )}
    </Text>
  );
}
