// Function to retrieve script URL from the stack trace
const getScriptUrl = () => {
  const error = new Error();
  const stack = error.stack || '';
  console.log('stack', stack);
  const regex = /at[^:\\/]+(file:\/\/)?((\/|\w:)[^):]+):\d+:\d+/;
  const match = stack.match(regex);
  return match ? `file://${match[2]}` : null;
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