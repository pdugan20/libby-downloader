/**
 * Mock implementation of chalk for testing
 */

const identity = (str: string) => str;

const chalk = {
  bold: Object.assign(identity, { cyan: identity }),
  cyan: identity,
  green: identity,
  yellow: identity,
  gray: identity,
  red: identity,
  blue: identity,
};

export default chalk;
