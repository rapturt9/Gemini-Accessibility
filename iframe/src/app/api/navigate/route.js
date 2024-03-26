import fs from "fs";
import path from "path";

const { chromium } = require("playwright");

//use wombat for better rewriting

async function inlineResources(page, baseUrl) {
  // Inline CSS
  const styleSheets = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => {
        if (!link.href.includes("fontawesome")) {
          // Skip FontAwesome CSS
          return link.href;
        }
        return null; // Return null for stylesheets that shouldn't be inlined
      })
      .filter((href) => href !== null);
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
  const scripts = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll('script[src]:not([type="application/ld+json"])')
    ).map((script) => script.src)
  );

  for (const scriptSrc of scripts) {
    try {
      const content = await page.evaluate(async (src) => {
        const response = await fetch(src);
        return response.ok ? response.text() : "";
      }, scriptSrc);

      if (content) {
        await page.evaluate((content) => {
          const script = document.createElement("script");
          script.type = "text/javascript";
          script.textContent = content;
          document.body.appendChild(script);
        }, content);
      }
    } catch (e) {
      console.error(`Failed to load script: ${scriptSrc}`);
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

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(process.cwd(), `screenshots/${name}.png`);
  // screenshot entire page
  await page.screenshot({ path: screenshotPath, fullPage: true });
  //await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);
}

export async function POST(request) {
  const requestObj = await request.json();
  const { url } = requestObj;

  const browser = await chromium.launch();
  const context = await browser.newContext(); // Create a new browser context
  const page = await context.newPage(); // Use the context to create a new page

  //await page.goto(url, { waitUntil: "networkidle" });
  // waint until notworkidle or 2 seconds
  async function gotoWithTimeout(page, url, timeout) {
    await Promise.race([
      page.goto(url, { waitUntil: "networkidle" }),
      new Promise((resolve) => setTimeout(resolve, timeout)),
    ]);
  }

  // Usage:
  const timeout = 5000; // 2000ms timeout
  await gotoWithTimeout(page, url, timeout);

  console.log("Navigated to", url);

  await takeScreenshot(page, "before");

  await inlineResources(page, url);

  await takeScreenshot(page, "after");

  const content = await page.content();
  await browser.close();

  const combinedResponse = {
    html: content, // HTML content
  };

  return new Response(JSON.stringify(combinedResponse), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
