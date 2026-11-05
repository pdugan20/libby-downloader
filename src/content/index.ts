/**
 * Content script for Libby Downloader
 * Runs on Libby pages, including before in-app navigation opens a loan
 * Orchestrates UI and message handling
 */

import { DEBUG_MODE } from './constants';
import { MessageHandler } from './message-handler';
import { UIManager } from './ui-manager';

console.log('[Libby Downloader] Content script loaded');

if (DEBUG_MODE) {
  console.log('[Libby Downloader] DEBUG MODE enabled');
}

// Libby opens loans through client-side navigation. Register on the initial
// app page so clicks from a player iframe created later are handled as well.
const uiManager = new UIManager();
const messageHandler = new MessageHandler(uiManager);

// Setup message listeners
messageHandler.setupListeners();

console.log('[Libby Downloader] Ready - waiting for button click from iframe');
