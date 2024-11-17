import { use } from 'use-m';

/** @type {import('lodash')} */
const _ = await use('lodash@4.17.21');

console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
