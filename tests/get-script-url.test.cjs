const { describe, test, expect } = require('@jest/globals');

// Function to retrieve this script URL from the stack trace
const module = `[${__filename.split('.').pop()} module]`;

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
describe(`${module} __filename workaround`, () => {
  test(`${module} scriptUrl matches __filename as URL`, async () => {
    const scriptUrl = await getScriptUrl();
    const { pathToFileURL } = await import('url');
    const expectedUrl = pathToFileURL(__filename).href;

    // Validate scriptUrl is a string and matches __filename as URL
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(expectedUrl);
  });

  test(`${module} scriptUrl matches __filename as URL in eval`, async () => {
    const scriptUrl = await eval('getScriptUrl()');
    const { pathToFileURL } = await import('url');
    const expectedUrl = pathToFileURL(__filename).href;

    // Validate scriptUrl is a string and matches __filename as URL
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(expectedUrl);
  });
});