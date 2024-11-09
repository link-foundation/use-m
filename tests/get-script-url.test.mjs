// Function to retrieve script URL from the stack trace
function getScriptUrl() {
  const error = new Error();
  const stack = error.stack || '';
  const regex = /at\s+\S+\s+\((\/[^)]+):\d+:\d+\)/;
  const match = stack.match(regex);
  return match ? `file://${match[1]}` : null;
}

// Test
describe('import.meta.url workaround', () => {
  test('scriptUrl matches import.meta.url', async () => {
    const scriptUrl = getScriptUrl();

    // Validate scriptUrl is a string and matches import.meta.url
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(import.meta.url);
  });

  test('scriptUrl matches import.meta.url in eval', async () => {
    const scriptUrl = eval('getScriptUrl()');

    // Validate scriptUrl is a string and matches import.meta.url
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(import.meta.url);
  });
});