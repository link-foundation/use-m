// Run from the repository root with node examples/load/priority-resolvers.mjs
import { makeUse } from 'use-m';

const load = await makeUse({
  resolverChain: [
    (specifier, resolvePath, options, { parentURL }) => {
      if (specifier === 'app:manifest') return new URL('../../package.json', parentURL);
      return undefined;
    },
    'builtin',
    'relative',
  ],
});

const manifest = await load('app:manifest', import.meta.url);
const path = await load('node:path');
console.log(manifest.name, path.join('examples', 'load'));
