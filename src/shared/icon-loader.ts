/**
 * Icon loader utility for Libby Downloader
 * Loads SVG icons as strings from assets directory
 */

import checkmarkSvg from '../assets/icons/checkmark.svg?raw';
import downloadSvg from '../assets/icons/download.svg?raw';
import errorSvg from '../assets/icons/error.svg?raw';
import spinnerSvg from '../assets/icons/spinner.svg?raw';

/**
 * Available icon names
 */
export type IconName = 'download' | 'spinner' | 'checkmark' | 'error';

/**
 * Icon registry mapping names to SVG strings
 */
const icons: Record<IconName, string> = {
  download: downloadSvg,
  spinner: spinnerSvg,
  checkmark: checkmarkSvg,
  error: errorSvg,
};

/**
 * Get an icon SVG string by name
 * @param name - The icon name
 * @returns The SVG string
 */
export function getIcon(name: IconName): string {
  return icons[name];
}
