import { use, freeze } from '../../use.mjs';

console.log('About to call freeze...');

// This freeze call should be replaced with a specific version
const _ = await use('lodash@4.17.21');

console.log('Freeze completed successfully!');
console.log(`Successfully loaded lodash: ${typeof _}`);
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
console.log(`_.capitalize('hello world') = ${_.capitalize('hello world')}`);