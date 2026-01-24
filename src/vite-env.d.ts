/// <reference types="vite/client" />

/**
 * Type declarations for Vite asset imports
 */

// SVG files imported as raw strings
declare module '*.svg?raw' {
  const content: string;
  export default content;
}

// Regular SVG imports
declare module '*.svg' {
  const content: string;
  export default content;
}
