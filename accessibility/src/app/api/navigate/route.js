import { chromium } from "playwright";

export async function POST(request) {
  console.log("Post request");
  const requestObj = await request.json();
  console.log(requestObj);
  const { url } = requestObj;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const content = await page.content();
  console.log(content);
  await browser.close();

  /*return {
    status: 200,
    body: { content },
  };*/
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
    },
  });
}
