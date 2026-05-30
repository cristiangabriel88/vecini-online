// Dev/demo-only diagnostic logger (T182).
//
// A no-op in PROD (VITE_APP_STAGE=prod and !import.meta.env.DEV) so the
// production bundle never writes diagnostic state or PII to the browser
// console. Vite's tree-shaker removes the no-op branches at build time.
//
// Route all diagnostic console calls through this module. Never write raw
// console.log/info/warn/debug calls in src/ -- a guard test enforces this.
// For user-visible error reporting use reportError() in errorReporting.ts.

const _active =
  import.meta.env.DEV || import.meta.env.VITE_APP_STAGE !== 'prod';

const _noop = (..._args: unknown[]): void => {};

export const devLog = {
  log:   _active ? console.log.bind(console)   : _noop,
  info:  _active ? console.info.bind(console)  : _noop,
  warn:  _active ? console.warn.bind(console)  : _noop,
  debug: _active ? console.debug.bind(console) : _noop,
} as const;
