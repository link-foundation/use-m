import { describe, test, expect } from '../src/test-adapter.mjs';

// Function to retrieve this script URL from the stack trace
const moduleName = `[${import.meta.url.split('.').pop()} module]`;

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
describe(`${moduleName} import.meta.url workaround`, () => {
  test(`${moduleName} scriptUrl matches import.meta.url`, async () => {
    const scriptUrl = await getScriptUrl();

    // Validate scriptUrl is a string and matches import.meta.url
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(import.meta.url);
  });

  test(`${moduleName} scriptUrl matches import.meta.url in eval`, async () => {
    const scriptUrl = await eval('getScriptUrl()');

    // Validate scriptUrl is a string and matches import.meta.url
    expect(typeof scriptUrl).toBe('string');
    expect(scriptUrl).toBe(import.meta.url);
  });

  test(`${moduleName} extracts Windows drive-letter file URLs`, async () => {
    const stack = '    at getScriptUrl (file:///D:/a/use-m/use-m/tests/get-script-url.test.mjs:8:17)\n';

    expect(await scriptUrlFromStack(stack)).toBe(
      'file:///D:/a/use-m/use-m/tests/get-script-url.test.mjs'
    );
  });
});
