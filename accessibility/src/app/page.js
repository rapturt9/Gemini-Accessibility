"use client";
import React, { useState } from "react";
import axios from "axios";

export default function Home() {
  const [url, setUrl] = useState("https://calendar.google.com"); // State for the input value
  const [iframeSrc, setIframeSrc] = useState("");
  const [violations, setViolations] = useState([
    {
      error: "landmark-one-main",
      description: "Ensures the document has a main landmark",
      change: "Document should have one main landmark",
      incorrect: [['<html lang="en-US" dir="ltr">']],
    },
    {
      error: "region",
      description: "Ensures all page content is contained by landmarks",
      change: "All page content should be contained by landmarks",
      incorrect: [
        [
          '<div class="gEc4r"><img src="//ssl.gstatic.com/images/branding/googlelogo/2x/googlelogo_color_74x24dp.png" class="TrZEUc" alt="Google" width="74" height="24"></div>',
        ],
        [
          '<div jsname="paFcre"><div class="aMfydd" jsname="tJHJj"><h1 class="Tn0LBd" jsname="r4nke">Sign in</h1><p class="a2CQh" jsname="VdSJob">to continue to Google Calendar</p></div></div>',
        ],
        ['<div class="Flfooc">'],
        ['<p class="vOZun">'],
        [
          '<span jsslot=""><div class="D4rY0b"><p class="vOZun">Not your computer? Use a private browsing window to sign in. <a href="https://support.google.com/accounts?p=signin_privatebrowsing&amp;hl=en-US" jsname="JFyozc" target="_blank">Learn more about using Guest mode</a></p></div></span>',
        ],
        ['<div class="tmMcIf" jsname="QkNstf">'],
      ],
    },
    {
      error: "select-name",
      description: "Ensures select element has an accessible name",
      change: "Select element must have an accessible name",
      incorrect: [
        [
          '<select name="hl" class="N158t" data-language-selector-select="" jsname="rfCUpd">',
        ],
      ],
    },
  ]);

  function transformViolationsForFixIssues(violations) {
    // Transform each violation into the expected format
    return violations.map((violation) => ({
      error: violation.id,
      description: violation.description,
      change: violation.help, // Assuming 'help' is the desired field for 'change'
      // Aggregate HTML strings from nodes into a List[List[string]] for 'incorrect elements'
      incorrect: violation.nodes.map((node) => [node.html]),
    }));
  }

  const handleNavigate = async () => {
    console.log("Navigate to", url);
    if (!url) return; // Optional: handle empty input case

    try {
      const response = await axios.get(
        "https://px23nz6me576xlcst27mlaxroa0qzbci.lambda-url.us-east-1.on.aws/",
        { params: { url } }
      );
      const transformedViolations = transformViolationsForFixIssues(
        response.data.violations
      );
      console.log("Violations:", transformedViolations);
      setViolations(transformedViolations);
      const blob = new Blob([response.data.html], { type: "text/html" });
      setIframeSrc(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Error:", error);
      // Optional: handle error (e.g., display a message)
    }
  };

  const fixViolations = async () => {
    try {
      const response = await axios.post("/api/complete", {
        issues: violations,
        websiteName: url,
        image: "", // Optional: add a screenshot
        fewShot: true, // Optional: use few-shot prompting
      });
      console.log("Response:", response);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={url} // Controlled component
          onChange={(e) => setUrl(e.target.value)} // Update state on change
          placeholder="Enter URL"
          className="border p-2 text-black"
        />
        <button onClick={fixViolations} className="bg-blue-500 text-white p-2">
          Navigate
        </button>
      </div>
      {iframeSrc && (
        <iframe
          src={iframeSrc}
          title="Result Page"
          className="w-full h-screen"
        ></iframe>
      )}
    </div>
  );
}
