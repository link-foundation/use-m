import { use, freeze } from '../../use.mjs';

// This freeze call should be replaced with a specific version
const _ = await freeze('lodash');

console.log(`Successfully loaded lodash: ${typeof _}`);
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
console.log(`_.capitalize('hello world') = ${_.capitalize('hello world')}`);