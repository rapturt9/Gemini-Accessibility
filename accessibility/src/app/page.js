"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  const [url, setUrl] = useState("https://calendar.google.com");
  const [iframeSrc, setIframeSrc] = useState("");
  const [violations, setViolations] = useState([]);
  const [fixesAvailable, setFixesAvailable] = useState(false);
  const [displayedFixes, setDisplayedFixes] = useState("");

  function transformViolationsForFixIssues(violations) {
    return violations.map((violation) => ({
      error: violation.id,
      description: violation.description,
      change: violation.help,
      incorrect: violation.nodes.map((node) => [node.html]),
    }));
  }

  const handleNavigate = async () => {
    console.log("Navigate to", url);
    if (!url) return;

    try {
      const response = await axios.get(
        `https://px23nz6me576xlcst27mlaxroa0qzbci.lambda-url.us-east-1.on.aws/`,
        { params: { url } }
      );
      const transformedViolations = transformViolationsForFixIssues(
        response.data.violations
      );
      console.log("Violations:", transformedViolations);
      setViolations(transformedViolations);
      const blob = new Blob([response.data.html], { type: "text/html" });
      setIframeSrc(URL.createObjectURL(blob));
      setFixesAvailable(true); // Indicate that fixes can now be applied
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fixViolations = async () => {
    if (!fixesAvailable) {
      console.log("No fixes to apply.");
      return;
    }

    try {
      const response = await axios.post("/api/complete", {
        issues: violations,
        websiteName: url,
        image: "", // Optional
        fewShot: true, // Optional
      });
      console.log("Fixes applied:", response.data);
      setDisplayedFixes(response.data);
      // Assuming the response contains updated HTML or fixes description
      // Update the iframeSrc or display the fixes as needed
    } catch (error) {
      console.error("Error applying fixes:", error);
    }
  };

  // Call fixViolations automatically once fixes are available
  useEffect(() => {
    if (fixesAvailable) {
      fixViolations();
    }
  }, [fixesAvailable]);

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 mb-8">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL"
          className="border-2 p-4 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
        />
        <button
          onClick={handleNavigate}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Load Page & Check Violations
        </button>
      </div>
      <div
        className="flex flex-row gap-4"
        style={{ height: "calc(100vh - 128px)" }}
      >
        <iframe
          src={iframeSrc}
          title="Result Page"
          className="flex-1 border-2 rounded-lg"
        />
        <div className="flex-1 overflow-y-scroll p-4 border-2 rounded-lg bg-gray-100 text-black">
          {violations.length > 0 && (
            <h2 className="text-lg font-semibold mb-4">Violations</h2>
          )}
          {violations.map((violation, index) => (
            <div key={index} className="mb-4 p-4 bg-white rounded-lg shadow">
              <p className="font-semibold">
                Error: <span className="font-normal">{violation.error}</span>
              </p>
              <p className="font-semibold">
                Description:{" "}
                <span className="font-normal">{violation.description}</span>
              </p>
              <p className="font-semibold">
                Change: <span className="font-normal">{violation.change}</span>
              </p>
              <p className="font-semibold">
                Incorrect Elements:{" "}
                <span className="font-normal">
                  {violation.incorrect.join(", ")}
                </span>
              </p>
            </div>
          ))}
          {displayedFixes && (
            <h2 className="text-lg font-semibold mb-4">Fixes</h2>
          )}
          {displayedFixes}
        </div>
      </div>
    </div>
  );
}
