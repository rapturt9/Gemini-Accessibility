"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useCompletion } from "ai/react";

export default function Home() {
  const { completion, input, stop, isLoading, handleInputChange, complete } =
    useCompletion();
  const [url, setUrl] = useState("https://calendar.google.com");
  const [iframeSrc, setIframeSrc] = useState("");
  const [violations, setViolations] = useState([]);
  const [fixesAvailable, setFixesAvailable] = useState(false);
  //const [displayedFixes, setDisplayedFixes] = useState("");
  const [navigating, setNavigating] = useState(false);

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
    setNavigating(true);

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
    console.log("Fix violations:", violations);
    if (!fixesAvailable) {
      console.log("No fixes to apply.");
      return;
    }

    try {
      console.log("Fixing violations");
      complete("", {
        headers: { "Content-Type": "application/json" },
        body: {
          issues: violations,
          websiteName: url,
          image: "", // Optional
          fewShot: true, // Optional
        },
      });
      /*const response = await axios.post("/api/complete", {
        issues: violations,
        websiteName: url,
        image: "", // Optional
        fewShot: true, // Optional
      });
      console.log("Fixes applied:", response.data);
      setDisplayedFixes(response.data);*/
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

  const parseDisplayedFixes = (displayedFixes) => {
    const fixes = [];
    const sections = displayedFixes.split("Thought:").slice(1); // Split by 'Thought:', ignore the first empty slice

    sections.forEach((section) => {
      const [thought, correctPart] = section
        .split("Correct:")
        .map((part) => part.trim());
      let correct = "";
      if (correctPart) {
        const correctMatches = correctPart.match(/\[\[.*?\]\]/g); // Match nested arrays

        correct = correctMatches
          ? correctMatches.map((match) => {
              // Remove the wrapping brackets and split by ','
              return match
                .slice(2, -2)
                .split("','")
                .map((str) => str.trim());
            })
          : [];
      }

      fixes.push({
        action: thought,
        correct: correct,
      });
    });

    return fixes;
  };

  const addFixesToViolations = () => {
    const fixes = parseDisplayedFixes(completion);
    // Ensure there is a one-to-one correspondence between violations and fixes
    /*if (fixes.length !== violations.length) {
      console.error(
        "The number of fixes does not match the number of violations."
      );
      return;
    }*/
    const updatedViolations = [...violations];
    for (let i = 0; i < violations.length; i++) {
      updatedViolations[i].fix = fixes[i];
    }

    setViolations(updatedViolations);
  };

  useEffect(() => {
    console.log(completion);
    addFixesToViolations();
  }, [completion]);

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 mb-8">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            let val = e.target.value;
            if (!val.startsWith("http")) {
              val = "https://" + val;
            }
            setUrl(val);
          }}
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
      {!fixesAvailable && navigating && (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-center text-sm mt-2 ml-3">
            Getting accessibility errors...
          </p>
        </div>
      )}

      {fixesAvailable && (
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
              <h2 className="text-lg font-semibold mb-4">
                Violations{completion && " and Fixes"}
              </h2>
            )}
            {violations.map((violation, index) => (
              <div key={index} className="mb-4 p-4 bg-white rounded-lg shadow">
                <p className="font-semibold text-red-500">
                  Error: <span className="font-normal">{violation.error}</span>
                </p>
                {violation.incorrect && (
                  <div className="mt-4">
                    <p className="font-semibold text-red-500">
                      Incorrect Elements:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {violation.incorrect.map((item, index) => (
                        <li key={index} className="font-normal">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="font-semibold">
                  Description:{" "}
                  <span className="font-normal">{violation.description}</span>
                </p>
                <p className="font-semibold">
                  Suggestion:{" "}
                  <span className="font-normal">{violation.change}</span>
                </p>
                {violation.fix && violation.fix.correct && (
                  <div className="mt-4">
                    <p className="font-semibold text-green-600">
                      Fix:{" "}
                      <span className="font-normal">
                        {violation.fix.action}
                      </span>
                    </p>
                    <p className="font-semibold text-green-600">Change:</p>
                    <ul className="list-disc list-inside">
                      {violation.fix.correct.map((group, groupIndex) => (
                        <li key={groupIndex}>
                          {group.map((item, itemIndex) => (
                            <span
                              key={itemIndex}
                              className="font-normal text-green-600"
                            >
                              {item}
                              {itemIndex < group.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
