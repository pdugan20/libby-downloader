import { Box, Text } from 'ink';

interface HeaderProps {
  total?: number;
  tagged?: number;
  merged?: number;
}

export function Header({ total, tagged, merged }: HeaderProps) {
  return (
    <Box marginBottom={1}>
      <Text bold>Libby Downloader</Text>
      {total !== undefined && (
        <Text dimColor>
          {'  '}
          {total} books · Tagged: {tagged}/{total} · Merged: {merged}/{total}
        </Text>
      )}
    </Box>
  );
}
