// Issue #81: when every CDN mirror fails, the aggregated error must say WHY
// each import failed (cause chain in the text) and keep the original errors
// as data (AggregateError#errors).
//
// Offline reproduction: an injected importer fails the way esm.sh's build of
// command-stream failed on Deno (a TypeError with code ERR_INVALID_ARG_VALUE),
// and `baseUse`-style wrapping adds "Failed to import module from '...'".
//
// Usage: node experiments/issue-81/aggregate-error-shape.mjs [path/to/use.mjs]
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const target = process.argv[2] ?? new URL('../../use.mjs', import.meta.url).pathname;
const { makeUse } = await import(pathToFileURL(path.resolve(target)).href);

const use = await makeUse({
  specifierResolvers: ['deno', 'jspm', 'skypack'],
  import: async (url) => {
    const root = new TypeError(
      "The argument 'filename' must be a file URL object, file URL string, or absolute path string. Received 'shelljs'"
    );
    root.code = 'ERR_INVALID_ARG_VALUE';
    throw new Error(`Failed to import module from '${url}'.`, { cause: root });
  },
});

try {
  await use('command-stream');
} catch (error) {
  console.log(error.message);
  console.log('---');
  console.log('name:', error.name);
  console.log('own properties:', Object.getOwnPropertyNames(error));
  console.log('errors:', Array.isArray(error.errors) ? error.errors.length : error.errors);
  console.log('errors[0].cause:', error.errors?.[0]?.cause?.code);
}
