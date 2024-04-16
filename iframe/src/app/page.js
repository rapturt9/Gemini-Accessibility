"use client";
import React, { useState } from "react";
import axios from "axios";

const testURLs = [
  "https://calendar.google.com",
  "https://sitewiz.ai",
  "https://www.boxbox.in",
  "https://jess.travel",
  "https://gnr8.jp",
  "https://myap.collegeboard.org",
  "https://slack.com",
  "https://soundcloud.com",
  "https://symbolic.com",
  "https://vimeo.com",
  "https://www.audible.com",
  "https://www.baidu.com",
  "https://www.barclays.co.uk",
  "https://www.bbc.com",
  "https://www.eventbrite.com",
  "https://www.facebook.com",
  "https://www.grubhub.com",
  "https://www.ieee.org",
  "https://www.itcorp.com",
  "https://www.mobileye.com",
  "https://www.nature.com",
  "https://www.nytimes.com",
  "https://www.patreon.com",
  "https://www.quora.com",
  "https://www.researchgate.net",
  "https://www.taylorguitars.com",
  "https://www.weebly.com",
  "https://www.whatsapp.com",
  "https://www.yokohamatire.com",
];

export default function Home() {
  const [url, setUrl] = useState("https://open.store/"); // State for the input value
  const [iframeSrc, setIframeSrc] = useState("");

  const handleNavigate = async () => {
    console.log("Navigate to", url);
    let useURL = "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      useURL = url;
    } else {
      useURL = "https://" + url;
    }
    if (!url) return; // Optional: handle empty input case

    try {
      const response = await axios.post("/api/navigate2", { url: useURL });
      console.log("Response:", response);
      const blob = new Blob([response.data.html], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);
      setIframeSrc(blobUrl);
    } catch (error) {
      console.error("Error:", error);
      // Optional: handle error (e.g., display a message)
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
        <button onClick={handleNavigate} className="bg-blue-500 text-white p-2">
          Navigate
        </button>
      </div>
      {iframeSrc && (
        <iframe
          src={iframeSrc}
          title="Result Page"
          className="w-full h-screen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        ></iframe>
      )}
    </div>
  );
}
