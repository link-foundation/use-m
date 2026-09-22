import { readFile } from 'node:fs/promises';
import { describe, test, expect } from '../src/test-adapter.mjs';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

const extractSection = (source, fileName, startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) {
    throw new Error(`Failed to find synchronized section in ${fileName}`);
  }
  return source.slice(start, end).trim();
};

describe(`${moduleName} distributed script synchronization`, () => {
  test(`${moduleName} npm recovery stays synchronized across mjs, cjs, and universal builds`, async () => {
    const files = ['src/use.mjs', 'src/use.cjs', 'src/use.js'];
    const sectionMarkers = [
      ['  npm: async (moduleSpecifier, pathResolver', '\n  bun: async'],
      ['// npm installs for the same alias must not overlap', '\n// Normalize a resolver reference'],
      ['    if (resolverChain.length === 1) {', '\n    return loadWithFallback('],
    ];
    const blocks = await Promise.all(files.map(async file => {
      const source = await readFile(file, 'utf8');
      return [
        file,
        sectionMarkers.map(([start, end]) => extractSection(source, file, start, end)),
      ];
    }));
    const reference = JSON.stringify(blocks[0][1]);
    const mismatchedFiles = blocks
      .filter(([, block]) => JSON.stringify(block) !== reference)
      .map(([file]) => file);

    expect(mismatchedFiles).toEqual([]);
  });
});
