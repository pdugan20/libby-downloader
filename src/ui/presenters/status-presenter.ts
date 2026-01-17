/**
 * StatusPresenter - Format status indicators
 */

import chalk from 'chalk';

export class StatusPresenter {
  /**
   * Format a boolean status with colored indicators
   */
  formatStatus(value: boolean, trueLabel = 'Yes', falseLabel = 'No'): string {
    if (value) {
      return chalk.green(`✓ ${trueLabel}`);
    }
    return chalk.yellow(`○ ${falseLabel}`);
  }

  /**
   * Format metadata status
   */
  formatMetadataStatus(hasMetadata: boolean): string {
    return this.formatStatus(hasMetadata);
  }

  /**
   * Format tagged status
   */
  formatTaggedStatus(isTagged: boolean): string {
    return this.formatStatus(isTagged);
  }

  /**
   * Format merged status
   */
  formatMergedStatus(isMerged: boolean): string {
    return this.formatStatus(isMerged);
  }

  /**
   * Get simple status indicator (✓ or ○)
   */
  getIndicator(value: boolean): string {
    return value ? chalk.green('✓') : chalk.yellow('○');
  }

  /**
   * Format count with label (e.g., "3/10 tagged")
   */
  formatCount(count: number, total: number, label: string): string {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const color = percentage === 100 ? chalk.green : percentage > 0 ? chalk.yellow : chalk.gray;

    return color(`${count}/${total} ${label}`);
  }
}
