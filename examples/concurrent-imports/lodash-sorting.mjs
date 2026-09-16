import { use } from '../../src/use.mjs';

// ...and from a third one, which on a cold machine used to mean three parallel
// `npm install -g lodash-v-4.17.21@npm:lodash@4.17.21` runs writing one
// directory. use-m now collapses them into a single install.
const _ = await use('lodash@4.17.21');

export const sorted = (values) => _.sortBy(values);
