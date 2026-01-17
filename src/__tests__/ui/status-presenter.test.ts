/**
 * Tests for StatusPresenter
 */

import { StatusPresenter } from '../../ui/presenters/status-presenter';

describe('StatusPresenter', () => {
  let presenter: StatusPresenter;

  beforeEach(() => {
    presenter = new StatusPresenter();
  });

  describe('formatStatus', () => {
    it('should format true status with default labels', () => {
      const result = presenter.formatStatus(true);
      expect(result).toContain('✓');
      expect(result).toContain('Yes');
    });

    it('should format false status with default labels', () => {
      const result = presenter.formatStatus(false);
      expect(result).toContain('○');
      expect(result).toContain('No');
    });

    it('should use custom labels', () => {
      const result = presenter.formatStatus(true, 'Active', 'Inactive');
      expect(result).toContain('Active');
    });
  });

  describe('formatMetadataStatus', () => {
    it('should format metadata status', () => {
      const result = presenter.formatMetadataStatus(true);
      expect(result).toContain('✓');
      expect(result).toContain('Yes');
    });
  });

  describe('formatTaggedStatus', () => {
    it('should format tagged status', () => {
      const result = presenter.formatTaggedStatus(false);
      expect(result).toContain('○');
      expect(result).toContain('No');
    });
  });

  describe('formatMergedStatus', () => {
    it('should format merged status', () => {
      const result = presenter.formatMergedStatus(true);
      expect(result).toContain('✓');
      expect(result).toContain('Yes');
    });
  });

  describe('getIndicator', () => {
    it('should return green checkmark for true', () => {
      const result = presenter.getIndicator(true);
      expect(result).toContain('✓');
    });

    it('should return yellow circle for false', () => {
      const result = presenter.getIndicator(false);
      expect(result).toContain('○');
    });
  });

  describe('formatCount', () => {
    it('should format count with label', () => {
      const result = presenter.formatCount(3, 10, 'tagged');
      expect(result).toContain('3/10');
      expect(result).toContain('tagged');
    });

    it('should show green for 100% completion', () => {
      const result = presenter.formatCount(10, 10, 'done');
      expect(result).toContain('10/10');
    });

    it('should show yellow for partial completion', () => {
      const result = presenter.formatCount(5, 10, 'done');
      expect(result).toContain('5/10');
    });

    it('should handle zero total', () => {
      const result = presenter.formatCount(0, 0, 'items');
      expect(result).toContain('0/0');
    });
  });
});
