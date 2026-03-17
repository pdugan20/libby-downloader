import { Text } from 'ink';

interface ProgressBarProps {
  current: number;
  total: number;
  width?: number;
}

export function ProgressBar({ current, total, width = 20 }: ProgressBarProps) {
  const percent = total > 0 ? Math.min(current / total, 1) : 0;
  const filled = Math.round(percent * width);
  const empty = width - filled;

  return (
    <Text>
      <Text color="white">{'▓'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text>{'  '}</Text>
      <Text bold>{current}</Text>
      <Text dimColor>/{total}</Text>
    </Text>
  );
}
