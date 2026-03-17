import { useEffect, useState, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import { BookInfo } from '../../types/book';
import { BookService } from '../../services/book-service';
import { BookPresenter } from '../presenters/book-presenter';
import { Header } from './Header';
import { BookSelect } from './BookSelect';
import { BookList } from './BookList';
import { TagProgress } from './TagProgress';
import { MergeProgress } from './MergeProgress';
import { Indicator, Item } from './SelectTheme';

type View =
  | 'loading'
  | 'menu'
  | 'list'
  | 'tag-select'
  | 'tagging'
  | 'merge-select'
  | 'merging'
  | 'details';

interface MenuProps {
  dataDir?: string;
}

const menuItems = [
  { label: 'Tag MP3 files', value: 'tag' },
  { label: 'Merge chapters', value: 'merge' },
  { label: 'List all books', value: 'list' },
  { label: 'View book details', value: 'details' },
  { label: 'Exit', value: 'exit' },
];

export function InteractiveMenu({ dataDir }: MenuProps) {
  const { exit } = useApp();
  const bookPresenter = new BookPresenter();
  const [view, setView] = useState<View>('loading');
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookInfo | null>(null);
  const [tagBatch, setTagBatch] = useState<BookInfo[]>([]);
  const [tagBatchIndex, setTagBatchIndex] = useState(0);
  const [message, setMessage] = useState('');

  const refreshBooks = useCallback(async () => {
    const service = new BookService(dataDir);
    const discovered = await service.discoverBooks();
    setBooks(discovered);
    setView(discovered.length === 0 ? 'menu' : 'menu');
    return discovered;
  }, [dataDir]);

  useEffect(() => {
    refreshBooks();
  }, []);

  const stats =
    books.length > 0
      ? new BookService(dataDir).getStatistics(books)
      : { total: 0, tagged: 0, untagged: 0, merged: 0, unmerged: 0, withMetadata: 0 };

  const handleMenuSelect = (item: { value: string }) => {
    setMessage('');
    switch (item.value) {
      case 'tag': {
        const untagged = books.filter((b) => !b.isTagged);
        if (untagged.length === 0) {
          setMessage('All books are already tagged.');
          return;
        }
        setView('tag-select');
        break;
      }
      case 'merge': {
        const unmerged = books.filter((b) => !b.isMerged);
        if (unmerged.length === 0) {
          setMessage('All books are already merged.');
          return;
        }
        setView('merge-select');
        break;
      }
      case 'list':
        setView('list');
        break;
      case 'details':
        setView('details');
        break;
      case 'exit':
        exit();
        break;
    }
  };

  const handleTagSelect = (result: BookInfo | BookInfo[] | null) => {
    if (!result) {
      setView('menu');
      return;
    }
    if (Array.isArray(result)) {
      setTagBatch(result);
      setTagBatchIndex(0);
      setSelectedBook(result[0]);
      setView('tagging');
    } else {
      setTagBatch([]);
      setSelectedBook(result);
      setView('tagging');
    }
  };

  const handleTagComplete = () => {
    if (tagBatch.length > 0 && tagBatchIndex < tagBatch.length - 1) {
      const next = tagBatchIndex + 1;
      setTagBatchIndex(next);
      setSelectedBook(tagBatch[next]);
    } else {
      refreshBooks().then(() => setView('menu'));
    }
  };

  const handleMergeSelect = (result: BookInfo | BookInfo[] | null) => {
    if (!result || Array.isArray(result)) {
      setView('menu');
      return;
    }
    setSelectedBook(result);
    setView('merging');
  };

  const handleMergeComplete = () => {
    refreshBooks().then(() => setView('menu'));
  };

  const handleDetailsSelect = (result: BookInfo | BookInfo[] | null) => {
    if (!result || Array.isArray(result)) {
      setView('menu');
      return;
    }
    setSelectedBook(result);
  };

  // Render based on current view
  if (view === 'loading') {
    return <Text dimColor>Loading...</Text>;
  }

  if (books.length === 0) {
    return (
      <Box flexDirection="column" marginY={1}>
        <Header />
        <Text dimColor>No books found in downloads folder.</Text>
        <Text dimColor>
          Download books using the Chrome extension, then run this command again.
        </Text>
      </Box>
    );
  }

  if (view === 'list') {
    return (
      <Box flexDirection="column">
        <BookList dataDir={dataDir} inline books={books} />
        <Box marginTop={1}>
          <SelectInput
            indicatorComponent={Indicator}
            itemComponent={Item}
            items={[{ label: 'Back to menu', value: 'back' }]}
            onSelect={() => setView('menu')}
          />
        </Box>
      </Box>
    );
  }

  if (view === 'tag-select') {
    return (
      <Box flexDirection="column" marginY={1}>
        <Header total={stats.total} tagged={stats.tagged} merged={stats.merged} />
        <BookSelect
          books={books}
          message="Which book do you want to tag?"
          filter={(b) => !b.isTagged}
          allowAll
          allButtonText={`Tag all ${stats.untagged} untagged books`}
          onSelect={handleTagSelect}
        />
      </Box>
    );
  }

  if (view === 'tagging' && selectedBook) {
    return (
      <Box flexDirection="column" marginY={1}>
        <Header total={stats.total} tagged={stats.tagged} merged={stats.merged} />
        <Box marginBottom={1}>
          <Text dimColor>Tagging: </Text>
          <Text bold>{bookPresenter.getTitle(selectedBook)}</Text>
        </Box>
        <TagProgress
          key={selectedBook.path}
          folderPath={selectedBook.path}
          onComplete={handleTagComplete}
          onError={() => refreshBooks().then(() => setView('menu'))}
        />
      </Box>
    );
  }

  if (view === 'merge-select') {
    const untaggedCount = books.filter((b) => !b.isMerged && !b.isTagged).length;
    return (
      <Box flexDirection="column" marginY={1}>
        <Header total={stats.total} tagged={stats.tagged} merged={stats.merged} />
        {untaggedCount > 0 && (
          <Box marginBottom={1}>
            <Text dimColor>
              {untaggedCount} book(s) not tagged yet — tag first for better metadata
            </Text>
          </Box>
        )}
        <BookSelect
          books={books}
          message="Which book do you want to merge?"
          filter={(b) => !b.isMerged}
          showStatus
          onSelect={handleMergeSelect}
        />
      </Box>
    );
  }

  if (view === 'merging' && selectedBook) {
    return (
      <Box flexDirection="column" marginY={1}>
        <Header total={stats.total} tagged={stats.tagged} merged={stats.merged} />
        <Box marginBottom={1}>
          <Text dimColor>Merging: </Text>
          <Text bold>{bookPresenter.getTitle(selectedBook)}</Text>
        </Box>
        <MergeProgress
          folderPath={selectedBook.path}
          onComplete={handleMergeComplete}
          onError={() => refreshBooks().then(() => setView('menu'))}
        />
      </Box>
    );
  }

  if (view === 'details' && selectedBook) {
    const authors = bookPresenter.getAuthors(selectedBook);
    const narrator = bookPresenter.getNarrator(selectedBook);

    return (
      <Box flexDirection="column" marginY={1}>
        <Header total={stats.total} tagged={stats.tagged} merged={stats.merged} />
        <Box flexDirection="column" paddingLeft={2} marginBottom={1}>
          <Text bold>{bookPresenter.getTitle(selectedBook)}</Text>
          {authors[0] !== 'Unknown' && <Text dimColor>Author: {authors.join(', ')}</Text>}
          {narrator && <Text dimColor>Narrator: {narrator}</Text>}
          <Text dimColor>Chapters: {selectedBook.chapterCount}</Text>
          <Text dimColor>
            Status: {selectedBook.isTagged ? '✓ tagged' : 'untagged'} /{' '}
            {selectedBook.isMerged ? '✓ merged' : 'unmerged'}
          </Text>
          <Text dimColor>Path: {selectedBook.path}</Text>
        </Box>
        <SelectInput
          indicatorComponent={Indicator}
          itemComponent={Item}
          items={[{ label: 'Back to menu', value: 'back' }]}
          onSelect={() => {
            setSelectedBook(null);
            setView('menu');
          }}
        />
      </Box>
    );
  }

  // Details view when no book is selected yet
  if (view === 'details') {
    return (
      <Box flexDirection="column" marginY={1}>
        <Header total={stats.total} tagged={stats.tagged} merged={stats.merged} />
        <BookSelect
          books={books}
          message="Which book do you want to view?"
          onSelect={handleDetailsSelect}
        />
      </Box>
    );
  }

  // Default: menu view
  return (
    <Box flexDirection="column" marginY={1}>
      <Header total={stats.total} tagged={stats.tagged} merged={stats.merged} />
      {message && (
        <Box marginBottom={1}>
          <Text dimColor>{message}</Text>
        </Box>
      )}
      <SelectInput
        indicatorComponent={Indicator}
        itemComponent={Item}
        items={menuItems}
        onSelect={handleMenuSelect}
      />
    </Box>
  );
}
