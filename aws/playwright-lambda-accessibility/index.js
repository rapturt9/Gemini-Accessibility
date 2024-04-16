const playwright = require("playwright-aws-lambda");
const { AxeBuilder } = require("@axe-core/playwright");

async function inlineResources(page, baseUrl) {
  // Inline CSS
  const styleSheets = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
      (link) => link.href
    );
  });

  for (const href of styleSheets) {
    try {
      const content = await page.evaluate(async (href) => {
        try {
          const response = await fetch(href);
          if (!response.ok) throw new Error("Failed to fetch");
          return await response.text();
        } catch {
          return null;
        }
      }, href);

      if (content) {
        await page
          .addStyleTag({ content })
          .catch((e) => console.error("Error adding style tag:", e));
      }
    } catch (e) {
      console.error(`Failed to inline stylesheet: ${href}`, e);
    }
  }

  await page.evaluate(() => {
    // Remove the original <link> tags for stylesheets
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(
      (link) => link.remove()
    );
  });

  // Inline JavaScript
  if (true) {
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("script[src]")).map(
        (script) => ({
          src: script.src,
        })
      );
    });

    for (const script of scripts) {
      if (script.src) {
        const content = await page.evaluate(async (src) => {
          try {
            const response = await fetch(src);
            if (response.ok) {
              return await response.text();
            }
            return ""; // Return an empty string if the fetch fails
          } catch {
            return ""; // Return an empty string in case of an error
          }
        }, script.src);

        // Only add the script tag if the content is not empty
        if (content) {
          await page.addScriptTag({ content });
        }
      }
    }
  }

  await page.evaluate(() => {
    // Remove the original <script> tags with src attributes
    Array.from(document.querySelectorAll("script[src]")).forEach((script) =>
      script.remove()
    );
  });

  await page.evaluate(async () => {
    document.querySelectorAll("iframe").forEach((iframe) => iframe.remove());
    const images = document.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map(async (img) => {
        const src = img.src;
        try {
          const response = await fetch(src);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = function () {
              img.src = reader.result;
              img.removeAttribute("srcset");
              resolve();
            };
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error("Failed to fetch image:", src, e);
        }
      })
    );

    document.querySelectorAll("source").forEach((source) => {
      source.removeAttribute("srcset");
    });
  });
}

exports.handler = async (event) => {
  let browser = null;
  console.log(event);
  try {
    // Parse the event body to get the URL from a Lambda Function URL invocation
    //const body = JSON.parse(event.body);
    const body = {};
    const url = event.queryStringParameters.url || "https://example.com";

    browser = await playwright.launchChromium({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });

    // Perform accessibility analysis
    const results = await new AxeBuilder({ page }).analyze();
    console.log("Accessibility violations for", url, results.violations);

    await inlineResources(page, url);

    const content = await page.content();
    await browser.close();

    const combinedResponse = {
      html: content, // HTML content
      violations: results.violations,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Adjust this value to be more restrictive based on your needs
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
      body: JSON.stringify(combinedResponse),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Adjust this value to be more restrictive based on your needs
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
