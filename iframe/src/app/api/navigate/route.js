import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const { chromium } = require("playwright");

//use wombat for better rewriting

// Config CORS
// ========================================================
/**
 *
 * @param origin
 * @returns
 */
const getCorsHeaders = (origin) => {
  // allow all origins
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  return headers;
};

// Endpoints
// ========================================================
/**
 * Basic OPTIONS Request to simuluate OPTIONS preflight request for mutative requests
 */
export const OPTIONS = async (request) => {
  // Return Response
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: getCorsHeaders(request.headers.get("origin") || ""),
    }
  );
};
const prefix =
  "https://zmmdpdjoa4v5kphut7keu32vry0kdbja.lambda-url.us-east-1.on.aws/?url=";

async function inlineResources(page, baseUrl) {
  await page.evaluate(
    ({ prefix, baseUrl }) => {
      const base = new URL(baseUrl);
      const writeURL = (url) => {
        if (url.startsWith("/")) {
          return prefix + encodeURIComponent(new URL(url, base).href);
        } else {
          return prefix + encodeURIComponent(url);
        }
      };

      document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        link.href = writeURL(link.href);
      });
      document.querySelectorAll("script[src]").forEach((script) => {
        script.src = writeURL(script.src);
      });
      document.querySelectorAll("img").forEach((img) => {
        img.src = writeURL(img.src);
        if (img.srcset) {
          img.removeAttribute("srcset");
        }
      });
      document.querySelectorAll("iframe").forEach((iframe) => {
        iframe.src = writeURL(iframe.src);
      });
    },
    { prefix, baseUrl }
  );
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
  console.log("Navigating to", url);

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
      ...getCorsHeaders(request.headers.get("origin") || ""),
    },
  });
}
