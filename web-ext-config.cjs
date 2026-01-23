/**
 * web-ext configuration for Chrome extension validation
 *
 * Note: web-ext is primarily designed for Firefox extensions, so we ignore
 * Firefox-specific errors that don't apply to Chrome/Chromium extensions.
 */

module.exports = {
  sourceDir: './chrome-extension',

  // Ignore Firefox-specific validation errors
  ignoreFiles: [],

  // Lint configuration
  lint: {
    // Output format
    pretty: true,

    // Self-hosted extensions don't need all Firefox requirements
    selfHosted: true,

    // Metadata for validation
    metadata: false,
  },

  // Build configuration (not used, but good to have)
  build: {
    overwriteDest: true,
  },
};
