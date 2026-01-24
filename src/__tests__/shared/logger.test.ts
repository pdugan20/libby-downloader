/**
 * Tests for logger utility
 */

import { LogLevel, logger } from '../../shared/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('debug', () => {
    it('should log debug message when level is DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Debug message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[Libby Downloader] [DEBUG]', 'Debug message');
    });

    it('should log debug message with context', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Debug message', { key: 'value' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[Libby Downloader] [DEBUG]', 'Debug message', {
        key: 'value',
      });
    });

    it('should not log when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug('Debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info message', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Info message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[Libby Downloader]', 'Info message');
    });

    it('should log info message with context', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Info message', { count: 5 });
      expect(consoleLogSpy).toHaveBeenCalledWith('[Libby Downloader]', 'Info message', {
        count: 5,
      });
    });

    it('should not log when level is WARN', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('Info message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Libby Downloader] [WARN]', 'Warning message');
    });

    it('should log warning with context', () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn('Warning', { reason: 'test' });
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Libby Downloader] [WARN]', 'Warning', {
        reason: 'test',
      });
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Libby Downloader] [ERROR]', 'Error message');
    });

    it('should log error with Error object', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Libby Downloader] [ERROR]',
        'Operation failed',
        expect.objectContaining({
          error: 'Test error',
        })
      );
    });

    it('should log error with context', () => {
      logger.error('Error', undefined, { operation: 'download' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Libby Downloader] [ERROR]', 'Error', {
        operation: 'download',
      });
    });
  });

  describe('operation helpers', () => {
    beforeEach(() => {
      logger.setLevel(LogLevel.DEBUG);
    });

    it('should log operation start', () => {
      logger.operationStart('Download');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Libby Downloader] [DEBUG]',
        'Starting: Download'
      );
    });

    it('should log operation start with context', () => {
      logger.operationStart('Download', { chapterIndex: 3 });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Libby Downloader] [DEBUG]',
        'Starting: Download',
        { chapterIndex: 3 }
      );
    });

    it('should log operation complete', () => {
      logger.operationComplete('Download');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Libby Downloader] [DEBUG]',
        'Completed: Download'
      );
    });

    it('should log operation failed', () => {
      const error = new Error('Failed');
      logger.operationFailed('Download', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Libby Downloader] [ERROR]',
        'Failed: Download',
        expect.objectContaining({
          error: 'Failed',
        })
      );
    });
  });
});
