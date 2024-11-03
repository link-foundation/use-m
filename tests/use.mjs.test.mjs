import { writeFileSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const fileName = path.basename(__filename);
  const __dirname = path.dirname(__filename);
  const tempFilePath = path.join(__dirname, "temp_use.mjs");

  try {
    const response = await fetch("https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use.mjs");
    const scriptContent = await response.text();
    writeFileSync(tempFilePath, scriptContent);

    const { use } = await import(tempFilePath);

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