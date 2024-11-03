import { writeFileSync, unlinkSync } from "fs";
import path from "path";

describe("use.mjs", () => {
  let use;

  beforeAll(async () => {
    const response = await fetch("https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use.mjs");
    const scriptContent = await response.text();

    // Save the file temporarily
    const tempFilePath = path.join(__dirname, "temp_use.mjs");
    // console.log('tempFilePath', tempFilePath);
    writeFileSync(tempFilePath, scriptContent);

    // Dynamically import the function from the downloaded script
    const module = await import(`${tempFilePath}`);
    use = module.use;
  });

  afterAll(() => {
    // Clean up the temporary file
    unlinkSync(path.join(__dirname, "temp_use.mjs"));
  });

  it("dynamically loads lodash and performs chunk operation", async () => {
    const { default: _ } = await use("lodash@4.17.21");
    const result = _.chunk([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });
});