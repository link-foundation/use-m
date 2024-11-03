// Import necessary modules
const { writeFileSync, unlinkSync } = require("fs");
const path = require("path");

// Define the main function to simulate the tests
async function main() {
  // Initialize variable to hold the `use` function
  let use;

  // Temporary file path for the downloaded script
  const tempFilePath = path.join(__dirname, "temp_use.cjs");

  try {
    // Download the script content
    const response = await fetch("https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use.cjs");
    const scriptContent = await response.text();

    // Save the downloaded content to a temporary file
    writeFileSync(tempFilePath, scriptContent);

    // Require the function from the downloaded script
    const result = require(tempFilePath);
    use = result.use;

    // Test: dynamically load lodash and perform chunk operation
    const _ = await use("lodash@4.17.21");
    const resultChunk = _.chunk([1, 2, 3, 4, 5], 2);

    // Manually assert the result
    const expectedChunk = [[1, 2], [3, 4], [5]];
    if (JSON.stringify(resultChunk) === JSON.stringify(expectedChunk)) {
      console.log("Test passed: Lodash chunk operation works as expected.");
    } else {
      console.error("Test failed: Lodash chunk operation did not produce the expected result.");
      console.error("Expected:", expectedChunk);
      console.error("Received:", resultChunk);
    }
  } catch (error) {
    console.error("An error occurred during the test execution:", error);
  } finally {
    // Clean up the temporary file
    unlinkSync(tempFilePath);
  }
}

// Run the main function
main();