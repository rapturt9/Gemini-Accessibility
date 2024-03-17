"use client";
import React, { useState } from "react";
import axios from "axios";

export default function Home() {
  const [url, setUrl] = useState("https://calendar.google.com"); // State for the input value
  const [iframeSrc, setIframeSrc] = useState("");

  const handleNavigate = async () => {
    console.log("Navigate to", url);
    if (!url) return; // Optional: handle empty input case

    try {
      const response = await axios.post("/api/navigate", { url });
      console.log("Response:", response);
      const blob = new Blob([response.data.html], { type: "text/html" });
      setIframeSrc(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Error:", error);
      // Optional: handle error (e.g., display a message)
    }
  };

  const getViolations = async () => {
    try {
      const response = await axios.get("/api/violations", {
        params: {
          url,
        },
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
        <button onClick={getViolations} className="bg-blue-500 text-white p-2">
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
