import path from "path";
import { fileURLToPath } from "url";

const loadUse = async () => {
  return fetch('https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/loadUse.mjs')
    .then((response) => response.text())
    .then((code) => eval(code)());
};

(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const currentFileName = path.basename(__filename);

  try {
    const use = await loadUse();

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