import { use } from '../../src/use.mjs';

// The same package, requested from a second module during the same tick.
const _ = await use('lodash@4.17.21');

export const titles = (values) => values.map(value => _.startCase(value));
