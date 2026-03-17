import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { BookInfo } from '../../types/book';
import { BookPresenter } from '../presenters/book-presenter';
import { Indicator, Item } from './SelectTheme';

interface BookSelectProps {
  books: BookInfo[];
  message: string;
  filter?: (book: BookInfo) => boolean;
  allowAll?: boolean;
  allButtonText?: string;
  showStatus?: boolean;
  onSelect: (result: BookInfo | BookInfo[] | null) => void;
}

interface SelectItem {
  label: string;
  value: string;
}

export function BookSelect({
  books,
  message,
  filter,
  allowAll,
  allButtonText,
  showStatus,
  onSelect,
}: BookSelectProps) {
  const bookPresenter = new BookPresenter();
  const filteredBooks = filter ? books.filter(filter) : books;

  if (filteredBooks.length === 0) {
    onSelect(null);
    return null;
  }

  const bookMap = new Map<string, BookInfo>();
  const items: SelectItem[] = [];

  filteredBooks.forEach((book, i) => {
    const key = `book_${i}`;
    bookMap.set(key, book);

    let label = bookPresenter.getDisplayName(book);
    if (showStatus) {
      const status = book.isTagged ? ' [tagged]' : '';
      label += status;
    }

    items.push({ label, value: key });
  });

  if (allowAll) {
    items.push({
      label: allButtonText || `All ${filteredBooks.length} books`,
      value: '__ALL__',
    });
  }

  items.push({ label: 'Cancel', value: '__CANCEL__' });

  const handleSelect = (item: SelectItem) => {
    if (item.value === '__CANCEL__') {
      onSelect(null);
    } else if (item.value === '__ALL__') {
      onSelect(filteredBooks);
    } else {
      onSelect(bookMap.get(item.value) || null);
    }
  };

  return (
    <Box flexDirection="column">
      <Text dimColor>{message}</Text>
      <SelectInput
        items={items}
        onSelect={handleSelect}
        indicatorComponent={Indicator}
        itemComponent={Item}
      />
    </Box>
  );
}
