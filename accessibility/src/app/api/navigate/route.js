import { chromium } from "playwright";
import { GoogleGenerativeAI } from "@google/generative-ai";

import fs from "fs";
import path from "path";

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
  });
}

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(process.cwd(), `screenshots/${name}.png`);
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);
}

export async function POST(request) {
  const requestObj = await request.json();
  const { url } = requestObj;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle" });

  await takeScreenshot(page, "before");

  // Attempt to inline CSS and JavaScript resources
  await inlineResources(page, url);

  await takeScreenshot(page, "after");

  const content = await page.content();
  await browser.close();

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
    },
  });
}



// Inputs

// isusses: list of accessibility issues in the format [{error: string, 
                                                      //   description: string, 
                                                      //   change: string, 
                                                      //   incorrect elements: List[List[string]]
                                                      // }]
// websiteName: url for website
// image: screenshot of page
// fewShot: boolean to use fewShot prompting

export async function fixIssues(issues, websiteName, image, fewShot) {

  const genAI = new GoogleGenerativeAI(
    "YOUR-API-KEY-HERE"
  );

  const fetchData = async () => {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const systemPrompt = `You are helpful assistant who will correct accessibility issues of a provided website.

    Provide your thought before you provide a fixed version of the result.
    
    E.g.
    Incorrect: [['<h3></h3>', '<h3></h3>', '<h3></h3>']]
    Thought: because ... I will ...
    Correct: [['<h3>Some heading</h3>', '<h3>Some heading</h3>', '<h3>Some heading</h3>']]
    
    

    User Message:
    You are operating on this website: ` + websiteName + "\n\n";

    var issuePrompt = ""
    for (var i = 0; i < issues.length; i ++){
      const issue = issues[i];
      issuePrompt += "Error: " + issue.error + "\n";
      issuePrompt += "Description: " + issue.description + "\n";
      issuePrompt += "Suggested change: " + issue.change + "\n";
      issuePrompt += "Incorrect: " + issue.incorrect + "\n\n";

    }


    const finalPrompt = systemPrompt + issuePrompt;


    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();
    return text;
  };

  if (image) {

  }



  return fetchData(issues);





  

}