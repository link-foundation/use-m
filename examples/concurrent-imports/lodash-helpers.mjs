import { use } from '../../src/use.mjs';

// Node.js evaluates the sibling modules of `main.mjs` concurrently, so this
// top-level await starts at the same moment as the ones in the other modules.
const _ = await use('lodash@4.17.21');

export const unique = (values) => _.uniq(values);
