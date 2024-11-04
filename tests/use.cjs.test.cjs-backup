const path = require("path");

(async () => {
  const currentFileName = path.basename(__filename);

  try {
    // const fs = require('fs').promises;
    // const use = await fs.readFile('/Users/konard/Desktop/konard/use/src/use.cjs', 'utf8')
    //   .then((code) => eval(code));

    // const { use } = require('../src/use-module.cjs');

    const use = await fetch('https://raw.githubusercontent.com/konard/use/refs/heads/main/src/use.cjs')
      .then((response) => response.text())
      .then((code) => eval(code));

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