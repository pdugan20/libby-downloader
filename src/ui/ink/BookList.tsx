import { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import { BookInfo } from '../../types/book';
import { BookService } from '../../services/book-service';
import { BookPresenter } from '../presenters/book-presenter';
import Spinner from 'ink-spinner';
import { Header } from './Header';

interface BookListProps {
  dataDir?: string;
}

export function BookList({ dataDir }: BookListProps) {
  const { exit } = useApp();
  const [books, setBooks] = useState<BookInfo[] | null>(null);
  const bookPresenter = new BookPresenter();

  useEffect(() => {
    const bookService = new BookService(dataDir);
    bookService.discoverBooks().then((discovered) => {
      setBooks(discovered);
      // Exit after render
      setTimeout(() => exit(), 100);
    });
  }, []);

  if (books === null) {
    return (
      <Box>
        <Text>
          <Spinner type="dots" />
        </Text>
        <Text> Scanning for books...</Text>
      </Box>
    );
  }

  if (books.length === 0) {
    const bookService = new BookService(dataDir);
    return (
      <Box flexDirection="column" marginY={1}>
        <Header />
        <Text color="yellow">No books found in downloads folder.</Text>
        <Text dimColor>
          Use the Chrome extension to download books to: {bookService.getDownloadsFolder()}
        </Text>
      </Box>
    );
  }

  // Calculate column widths
  const titles = books.map((b) => bookPresenter.getTitle(b));
  const authors = books.map((b) => {
    const a = bookPresenter.getAuthors(b);
    return a[0] !== 'Unknown' ? a.join(', ') : '';
  });
  const maxTitle = Math.min(Math.max(...titles.map((t) => t.length), 10), 28);
  const maxAuthor = Math.min(Math.max(...authors.map((a) => a.length), 6), 20);

  const stats = new BookService(dataDir).getStatistics(books);

  return (
    <Box flexDirection="column" marginY={1}>
      <Header total={stats.total} tagged={stats.tagged} merged={stats.merged} />

      {books.map((book, i) => {
        const title = bookPresenter.getTitle(book);
        const author = authors[i];
        const chStr = `${book.chapterCount} ch`;

        const statusParts: string[] = [];
        if (book.isTagged) statusParts.push('✓ tagged');
        else statusParts.push('untagged');
        if (book.isMerged) statusParts.push('✓ merged');
        else statusParts.push('unmerged');

        return (
          <Box key={book.path} paddingLeft={2}>
            <Box width={maxTitle + 2}>
              <Text bold>{title}</Text>
            </Box>
            <Box width={maxAuthor + 2}>
              <Text dimColor>{author}</Text>
            </Box>
            <Box width={8}>
              <Text dimColor>{chStr}</Text>
            </Box>
            <Box>
              {statusParts.map((part, j) => (
                <Text
                  key={j}
                  color={part.startsWith('✓') ? 'green' : undefined}
                  dimColor={!part.startsWith('✓')}
                >
                  {j > 0 ? '  ' : ''}
                  {part}
                </Text>
              ))}
            </Box>
          </Box>
        );
      })}

      <Box marginTop={1} paddingLeft={2} flexDirection="column">
        {stats.tagged < stats.total && (
          <Text dimColor>
            Tag files: <Text color="cyan">libby tag</Text>
          </Text>
        )}
        {stats.merged < stats.total && (
          <Text dimColor>
            Merge chapters: <Text color="cyan">libby merge</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}
