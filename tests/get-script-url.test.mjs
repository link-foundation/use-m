// Function to retrieve this script URL from the stack trace
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
describe('import.meta.url workaround', () => {
  test('scriptUrl matches import.meta.url', async () => {
    const scriptUrl = await getScriptUrl();

    // Validate scriptUrl is a string and matches import.meta.url
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(import.meta.url);
  });

  test('scriptUrl matches import.meta.url in eval', async () => {
    const scriptUrl = await eval('getScriptUrl()');

    // Validate scriptUrl is a string and matches import.meta.url
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(import.meta.url);
  });
});