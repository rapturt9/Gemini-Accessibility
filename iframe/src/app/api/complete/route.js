/*import { GoogleGenerativeAI } from "@google/generative-ai";

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
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const systemPrompt =
    `You are helpful assistant who will correct accessibility issues of a provided website.
  
      Provide your thought before you provide a fixed version of the result.
      
      E.g.
      Incorrect: [['<h3></h3>', '<h3></h3>', '<h3></h3>']]
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

  const finalPrompt = systemPrompt + issuePrompt;

  const result = await model.generateContent(finalPrompt);
  const response = await result.response;
  const text = response.text();
  return text;
}

export async function GET(req, res) {
  console.log("GET /api/complete");
  console.log(req.query);
  const { issues, websiteName, image, fewShot } = req.query;

  res.status(500).json({ success: false, error: "Failed to generate content" });

  // Parse 'issues' from JSON string to object
  // Note: URL length is limited, so this approach may not work for large data
  //const issuesParsed = JSON.parse(issues);

  try {
    // You would include logic here for handling 'image' and 'fewShot' as needed
    const aiResponse = await fixIssues(issues, websiteName, image, fewShot);

    res.status(200).json({ success: true, data: aiResponse });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Failed to generate content" });
  }
}
*/

export async function GET(req, res) {
  return new Response(JSON.stringify({ error: "Failed to get violations" }), {
    status: 500,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
