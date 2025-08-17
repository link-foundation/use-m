const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('../test-adapter.cjs');

// Function to retrieve this script URL from the stack trace
const moduleName = `[${__filename.split('.').pop()} module]`;

const getScriptUrl = async () => {
  const error = new Error();
  const stack = error.stack || '';
  const regex = /at[^:\\/]+(file:\/\/)?(?<path>(\/|(?<=\W)\w:)[^):]+):\d+:\d+/;
  const match = stack.match(regex);
  if (!match?.groups?.path) {
    return null;
  }
  const { pathToFileURL } = await import('node:url');
  return pathToFileURL(match.groups.path).href;
}

// Test
describe(`${moduleName} __filename workaround`, () => {
  test(`${moduleName} scriptUrl matches __filename as URL`, async () => {
    const scriptUrl = await getScriptUrl();
    const { pathToFileURL } = await import('node:url');
    const expectedUrl = pathToFileURL(__filename).href;

    // Validate scriptUrl is a string and matches __filename as URL
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(expectedUrl);
  });

  test(`${moduleName} scriptUrl matches __filename as URL in eval`, async () => {
    const scriptUrl = await eval('getScriptUrl()');
    const { pathToFileURL } = await import('node:url');
    const expectedUrl = pathToFileURL(__filename).href;

    // Validate scriptUrl is a string and matches __filename as URL
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(expectedUrl);
  });
});