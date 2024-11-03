import { writeFileSync, unlinkSync } from "fs";
import path from "path";

describe("use.cjs", () => {
  let use;

  beforeAll(async () => {
    const response = await fetch("https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use.cjs");
    const scriptContent = await response.text();

    // Save the file temporarily
    const tempFilePath = path.join(__dirname, "temp_use.cjs");
    // console.log('tempFilePath', tempFilePath);
    writeFileSync(tempFilePath, scriptContent);

    // Require the function from the downloaded script

    const result = require(tempFilePath);
    // console.log('result', result);

    use = result.use;
  });

  afterAll(() => {
    // Clean up the temporary file
    unlinkSync(path.join(__dirname, "temp_use.cjs"));
  });

  it("dynamically loads lodash and performs chunk operation", async () => {
    // In both `use.cjs.test.mjs` and `use.mjs.test.mjs`
    // Load lodash using the `use` function
    const lodashModule = await use("lodash@4.17.21");

    // Check if lodash was loaded as a default export (CommonJS) or as a named export (ESM)
    const _ = lodashModule.default || lodashModule;

    const result = _.chunk([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });
});