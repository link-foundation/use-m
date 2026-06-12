import { readFile } from 'node:fs/promises';
import { describe, test, expect } from '../test-adapter.mjs';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

const extractNpmResolver = (source, fileName) => {
  const start = source.indexOf('  npm: async (moduleSpecifier, pathResolver');
  const end = source.indexOf('\n  bun: async', start);
  if (start === -1 || end === -1) {
    throw new Error(`Failed to find npm resolver block in ${fileName}`);
  }
  return source.slice(start, end).trim();
};

describe(`${moduleName} distributed script synchronization`, () => {
  test(`${moduleName} npm resolver stays synchronized across mjs, cjs, and universal builds`, async () => {
    const files = ['use.mjs', 'use.cjs', 'use.js'];
    const blocks = await Promise.all(files.map(async file => {
      const source = await readFile(file, 'utf8');
      return [file, extractNpmResolver(source, file)];
    }));
    const reference = blocks[0][1];
    const mismatchedFiles = blocks
      .filter(([, block]) => block !== reference)
      .map(([file]) => file);

    expect(mismatchedFiles).toEqual([]);
  });
});
