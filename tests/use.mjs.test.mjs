import { writeFileSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Convert import.meta.url to a directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function for basic assertion
function assert(condition, message) {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    process.exit(1); // Exit with an error code if the test fails
  }
}

// Set up variables for testing
let use;
const tempFilePath = path.join(__dirname, "temp_use.mjs");

(async () => {
  try {
    // Download the file content
    const response = await fetch("https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use.mjs");
    const scriptContent = await response.text();

    // Save the file temporarily
    writeFileSync(tempFilePath, scriptContent);

    // Dynamically import the function from the downloaded script
    const { use } = await import(`${tempFilePath}`);

    // Perform the test
    const _ = await use("lodash@4.17.21");
    const result = _.chunk([1, 2, 3, 4, 5], 2);
    assert(JSON.stringify(result) === JSON.stringify([[1, 2], [3, 4], [5]]), "Lodash chunk operation did not return expected result");

    console.log("Test passed!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    // Clean up the temporary file
    unlinkSync(tempFilePath);
  }
})();