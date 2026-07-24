import { createMergedBook, createTaggedBook } from '../setup/fixtures/books.fixture';
import { getMergeSelectionBooks, getTagSelectionBooks } from '../../ui/ink/InteractiveMenu';

describe('Interactive menu', () => {
  it('should allow selecting an already-tagged book for re-tagging', () => {
    const taggedBook = createTaggedBook();

    const selectableBooks = getTagSelectionBooks([taggedBook]);

    expect(selectableBooks).toEqual([taggedBook]);
  });

  it('should allow selecting an already-merged book for re-merging', () => {
    const mergedBook = createMergedBook();

    const selectableBooks = getMergeSelectionBooks([mergedBook]);

    expect(selectableBooks).toEqual([mergedBook]);
  });
});
