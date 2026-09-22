const { describe, test, expect } = require('../src/test-adapter.cjs');

// Function to retrieve this script URL from the stack trace
const moduleName = `[${__filename.split('.').pop()} module]`;

const scriptUrlFromStack = async stack => {
  const fileUrl = stack.match(
    /(?<url>file:\/\/\/[^)\r\n]+?)(?=:\d+:\d+\)?(?:\r?\n|$))/
  )?.groups?.url;
  if (fileUrl) return fileUrl;

  const filePath = stack.match(
    /(?:\(|\s)(?<path>(?:\/|[A-Za-z]:[\\/])[^)\r\n]+?)(?=:\d+:\d+\)?(?:\r?\n|$))/
  )?.groups?.path;
  if (!filePath) return null;

  const { pathToFileURL } = await import('node:url');
  return pathToFileURL(filePath).href;
};

const getScriptUrl = async () => {
  const error = new Error();
  return scriptUrlFromStack(error.stack || '');
};

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

  test(`${moduleName} extracts Windows drive-letter file URLs`, async () => {
    const stack = '    at getScriptUrl (file:///D:/a/use-m/use-m/tests/get-script-url.test.cjs:8:17)\n';

    expect(await scriptUrlFromStack(stack)).toBe(
      'file:///D:/a/use-m/use-m/tests/get-script-url.test.cjs'
    );
  });
});
