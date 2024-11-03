import path from "path";
import { fileURLToPath } from "url";

const makeUse = async () => {
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  const { randomBytes } = await import('crypto');
  const { writeFile, unlink } = await import('fs/promises');
  const { pathToFileURL } = await import('url');
  const response = await fetch('https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use.mjs');
  const localUsePath = join(tmpdir(), randomBytes(42).toString('hex') + '.mjs');
  await writeFile(localUsePath, await response.text());
  const module = await import(pathToFileURL(localUsePath).href);
  const { use } = module;
  await unlink(localUsePath);
  return use;
};

(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const currentFileName = path.basename(__filename);

  try {
    const use = await makeUse();

    const _ = await use("lodash@4.17.21");
    const resultChunk = _.chunk([1, 2, 3, 4, 5], 2);
    const expectedChunk = [[1, 2], [3, 4], [5]];

    if (JSON.stringify(resultChunk) === JSON.stringify(expectedChunk)) {
      console.log(`[${currentFileName}] Test passed: Lodash chunk operation produced the expected result.`);
    } else {
      console.error(`[${currentFileName}] Test failed: Lodash chunk operation did not produce the expected result.`);
      console.error(`[${currentFileName}] Expected:`, expectedChunk);
      console.error(`[${currentFileName}] Received:`, resultChunk);
    }
  } catch (error) {
    console.error(`[${currentFileName}] Test encountered an error:`, error);
  }
})();