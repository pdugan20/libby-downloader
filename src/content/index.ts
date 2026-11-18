/**
 * Content script for Libby Downloader
 * Runs on libbyapp.com/open/loan/* pages
 * Orchestrates UI and message handling
 */

import { DEBUG_MODE } from './constants';
import { MessageHandler } from './message-handler';
import { UIManager } from './ui-manager';
import { consumeAutostartRequest } from '../shared/autostart';

console.log('[Libby Downloader] Content script loaded');

if (DEBUG_MODE) {
  console.log('[Libby Downloader] DEBUG MODE enabled');
} else {
  // Only run on audiobook player pages in production
  if (!window.location.pathname.includes('/open/loan/')) {
    console.log('[Libby Downloader] Not an audiobook page');
    throw new Error('Not an audiobook page');
  }
  console.log('[Libby Downloader] Audiobook page detected');
}

// Initialize components
const uiManager = new UIManager();
const messageHandler = new MessageHandler(uiManager);

// Setup message listeners
messageHandler.setupListeners();

// `libby download` opens the loan with a marker; read it before Libby's app loads
if (consumeAutostartRequest(window.location, window.history)) {
  console.log('[Libby Downloader] Download requested by libby download');
  messageHandler.requestAutostart();
}

console.log('[Libby Downloader] Ready - waiting for button click from iframe');
