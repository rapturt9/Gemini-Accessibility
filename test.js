const { webkit } = require("playwright"); // or 'chromium' or 'firefox'
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("fs");
const path = require("path");

async function checkAccessibility(url) {
  const browser = await webkit.launch();
  const context = await browser.newContext(); // Create a new browser context
  const page = await context.newPage(); // Use the context to create a new page
  await page.goto(url);

  const results = await new AxeBuilder({ page }).analyze();
  console.log("Accessibility violations for", url, results);
  await browser.close();

  return results.violations;
}

async function generateDataset(urls) {
  const dataset = [];

  for (let url of urls) {
    const violations = await checkAccessibility(url);
    for (let violation of violations) {
      dataset.push({
        webURL: url,
        id: violation.id,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        html: violation.nodes.map((node) => node.html).join("; "),
      });
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "testViolations.csv"),
    "webURL,id,description,help,helpUrl,html\n" +
      dataset.map((row) => Object.values(row).join(",")).join("\n")
  );
}

const urls = [
  "https://example.com",
  // Add more URLs as needed
];

generateDataset(urls).then(() =>
  console.log("Dataset generated successfully.")
);
