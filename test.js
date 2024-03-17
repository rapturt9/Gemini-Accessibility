const { chromium } = require("playwright"); // or 'chromium' or 'firefox'
const { AxeBuilder } = require("@axe-core/playwright");

async function checkAccessibility(url) {
  const browser = await chromium.launch();
  const context = await browser.newContext(); // Create a new browser context
  const page = await context.newPage(); // Use the context to create a new page
  await page.goto(url);

  const results = await new AxeBuilder({ page }).analyze();
  console.log("Accessibility violations for", url, results);
  await browser.close();

  return results.violations;
}

checkAccessibility("https://calendar.google.com").then((violations) => {
  console.log(violations);
});
