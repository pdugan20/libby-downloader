import { Box, Text, useApp } from 'ink';
import { EmbedOptions } from '../../services/metadata-service';
import { BookList } from './BookList';
import { TagProgress } from './TagProgress';
import { MergeProgress } from './MergeProgress';
import { InteractiveMenu } from './InteractiveMenu';
import { Header } from './Header';

export interface AppProps {
  command: 'interactive' | 'list' | 'tag' | 'merge';
  dataDir?: string;
  folder?: string;
  tagOptions?: EmbedOptions;
}

export function App({ command, dataDir, folder, tagOptions }: AppProps) {
  const { exit } = useApp();

  if (command === 'interactive') {
    return <InteractiveMenu dataDir={dataDir} />;
  }

  if (command === 'list') {
    return <BookList dataDir={dataDir} />;
  }

  if (command === 'tag' && folder) {
    return (
      <Box flexDirection="column" marginY={1}>
        <Header />
        <TagProgress
          folderPath={folder}
          options={tagOptions}
          onComplete={() => exit()}
          onError={() => exit()}
        />
      </Box>
    );
  }

  if (command === 'merge' && folder) {
    return (
      <Box flexDirection="column" marginY={1}>
        <Header />
        <MergeProgress folderPath={folder} onComplete={() => exit()} onError={() => exit()} />
      </Box>
    );
  }

  return <Text color="red">Missing required folder argument.</Text>;
}
