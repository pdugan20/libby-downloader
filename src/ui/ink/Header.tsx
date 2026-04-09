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
        <Text>
          {'  '}
          <Text dimColor>
            {total} {total === 1 ? 'book' : 'books'} ·{' '}
          </Text>
          <Text dimColor>Tagged: </Text>
          <Text color={tagged === total ? 'green' : 'yellow'}>
            {tagged}/{total}
          </Text>
          <Text dimColor> · Merged: </Text>
          <Text color={merged === total ? 'green' : 'yellow'}>
            {merged}/{total}
          </Text>
        </Text>
      )}
    </Box>
  );
}
