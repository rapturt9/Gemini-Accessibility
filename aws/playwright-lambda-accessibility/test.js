const chromium = require("playwright-core").chromium;
const { AxeBuilder } = require("@axe-core/playwright");

async function checkAccessibility(url) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);

  const results = await new AxeBuilder({ page }).analyze();
  await browser.close();
  return results.violations;
}

//Example usage
checkAccessibility("https://www.example.com").then((violations) => {
  console.log(violations);
});
