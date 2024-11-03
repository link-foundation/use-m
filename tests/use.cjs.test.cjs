const path = require("path");

const makeUse = async () => {
  const response = await fetch(`https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use.cjs`);
  const localUsePath = require('path').join(require('os').tmpdir(), require('crypto').randomBytes(42).toString('hex') + '.cjs');
  const { writeFileSync, unlinkSync } = require("fs");
  writeFileSync(localUsePath, await response.text());
  const { use } = require(localUsePath);
  unlinkSync(localUsePath);
  return use;
};

(async () => {
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