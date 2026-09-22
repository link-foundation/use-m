/**
 * Installs standards-compliant Web Fetch globals when the host does not
 * provide them. Existing host globals are preserved.
 *
 * @see https://github.com/link-foundation/use-m/issues/45
 */
export * from './src/fetch-polyfill.mjs'
export { default } from './src/fetch-polyfill.mjs'
