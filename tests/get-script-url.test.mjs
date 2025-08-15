import { describe, test, expect } from '@jest/globals';

// Function to retrieve this script URL from the stack trace
const module = `[${import.meta.url.split('.').pop()} module]`;

const getScriptUrl = async () => {
  const error = new Error();
  const stack = error.stack || '';
  const regex = /at[^:\\/]+(file:\/\/)?(?<path>(\/|(?<=\W)\w:)[^):]+):\d+:\d+/;
  const match = stack.match(regex);
  if (!match?.groups?.path) {
    return null;
  }
  const { pathToFileURL } = await import('url');
  return pathToFileURL(match.groups.path).href;
}

// Test
describe(`${module} import.meta.url workaround`, () => {
  test(`${module} scriptUrl matches import.meta.url`, async () => {
    const scriptUrl = await getScriptUrl();

    // Validate scriptUrl is a string and matches import.meta.url
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(import.meta.url);
  });

  test(`${module} scriptUrl matches import.meta.url in eval`, async () => {
    const scriptUrl = await eval('getScriptUrl()');

    // Validate scriptUrl is a string and matches import.meta.url
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(import.meta.url);
  });
});