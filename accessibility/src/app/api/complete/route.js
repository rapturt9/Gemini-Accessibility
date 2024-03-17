import { GoogleGenerativeAI } from "@google/generative-ai";

// Inputs

// isusses: list of accessibility issues in the format [{error: string,
//   description: string,
//   change: string,
//   incorrect elements: List[List[string]]
// }]
// websiteName: url for website
// image: screenshot of page
// fewShot: boolean to use fewShot prompting

async function fixIssues(issues, websiteName, image, fewShot) {
  console.log(process.env.GOOGLE_API_KEY);
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const systemPrompt =
    `You are helpful assistant who will correct accessibility issues of a provided website.
  
      Provide your thought before you provide a fixed version of the result.
      
      E.g.
      Thought: because ... I will ...
      Correct: [['<h3>Some heading</h3>', '<h3>Some heading</h3>', '<h3>Some heading</h3>']]

      Thought: because ... I will ...
      Correct: [['<h3>Some heading</h3>', '<h3>Some heading</h3>', '<h3>Some heading</h3>']]

      Thought: because ... I will ...
      Correct: [['<h3>Some heading</h3>', '<h3>Some heading</h3>', '<h3>Some heading</h3>']]
      
      
  
      User Message:
      You are operating on this website: ` +
    websiteName +
    "\n\n";

  var issuePrompt = "";
  for (var i = 0; i < issues.length; i++) {
    const issue = issues[i];
    issuePrompt += "Error: " + issue.error + "\n";
    issuePrompt += "Description: " + issue.description + "\n";
    issuePrompt += "Suggested change: " + issue.change + "\n";
    issuePrompt += "Incorrect: " + issue.incorrect + "\n\n";
  }

  const instructions = `Fix the accessibility issues for all the errors above.`;

  const finalPrompt = systemPrompt + issuePrompt + instructions;

  console.log("Final Prompt: ", finalPrompt);

  const result = await model.generateContent(finalPrompt, {
    maxTokens: 100000,
  });
  const response = await result.response;
  const text = response.text();
  return text;
}

export async function POST(req, res) {
  // Parse the JSON body from the request
  const requestObject = await req.json();
  const { issues, websiteName, image, fewShot } = requestObject;

  console.log("POST /api/complete", issues, websiteName, image, fewShot);

  try {
    const result = await fixIssues(issues, websiteName, image, fewShot);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
