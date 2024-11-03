// Import necessary modules
const { writeFileSync, unlinkSync } = require("fs");
const path = require("path");

(async () => {
  const fileName = path.basename(__filename);
  const tempFilePath = path.join(__dirname, "temp_use.cjs");

  try {
    const response = await fetch("https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use.cjs");
    const scriptContent = await response.text();
    writeFileSync(tempFilePath, scriptContent);

    const { use } = require(tempFilePath);

    const _ = await use("lodash@4.17.21");
    const resultChunk = _.chunk([1, 2, 3, 4, 5], 2);
    const expectedChunk = [[1, 2], [3, 4], [5]];

    if (JSON.stringify(resultChunk) === JSON.stringify(expectedChunk)) {
      console.log(`[${fileName}] Test passed: Lodash chunk operation produced the expected result.`);
    } else {
      console.error(`[${fileName}] Test failed: Lodash chunk operation did not produce the expected result.`);
      console.error(`[${fileName}] Expected:`, expectedChunk);
      console.error(`[${fileName}] Received:`, resultChunk);
    }
  } catch (error) {
    console.error(`[${fileName}] Test encountered an error:`, error);
  } finally {
    unlinkSync(tempFilePath);
  }
})();