import { use, freeze } from '../../use.mjs';

console.log('Testing freeze with simple-git...');

// This should get frozen to the latest version
const simpleGit = await use('simple-git@3.28.0');

console.log('Successfully loaded simple-git:', typeof simpleGit);
console.log('simple-git is a function:', typeof simpleGit === 'function');