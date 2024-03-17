const playwright = require("playwright-aws-lambda");
const { AxeBuilder } = require("@axe-core/playwright");

exports.handler = async (event, context) => {
  let browser = null;

  console.log("Event: ", event);

  try {
    browser = await playwright.launchChromium();
    console.log("Browser launched");
    const context = await browser.newContext();
    console.log("Context created");
    const page = await context.newPage();
    await page.goto(event.url || "https://example.com");
    const results = await new AxeBuilder({ page }).analyze();

    return {
      statusCode: 200,
      body: JSON.stringify(results.violations),
    };
  } catch (error) {
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
