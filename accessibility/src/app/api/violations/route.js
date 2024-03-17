const { chromium } = require("playwright"); // or 'chromium' or 'firefox'
const { AxeBuilder } = require("@axe-core/playwright");

export async function GET(req, res) {
  console.log("GET /api/violations");
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext(); // Create a new browser context
    const page = await context.newPage(); // Use the context to create a new page
    await page.goto(url);
    const results = await new AxeBuilder({ page }).analyze();
    console.log("Accessibility violations for", url, results);
    await browser.close();
    return new Response(JSON.stringify(results.violations), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to get violations" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
