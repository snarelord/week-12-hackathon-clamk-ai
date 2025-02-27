"use client";

import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);

  const handleSubmit = async (action) => {
    const response = await fetch("/api/pinecone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, action }),
    });
    const data = await response.json();
    if (action === "search") setResults(data);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">
        🎬 Movie Recommendation Engine
      </h1>

      <input
        className="p-2 mb-4 w-80 rounded bg-gray-800 border border-gray-700 text-white"
        type="text"
        placeholder="Enter a movie title..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex space-x-4">
        <button
          className="px-4 py-2 bg-blue-500 rounded"
          onClick={() => handleSubmit("store")}
        >
          Store Movie
        </button>
        <button
          className="px-4 py-2 bg-green-500 rounded"
          onClick={() => handleSubmit("search")}
        >
          Get Recommendations
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-6 w-80 p-4 bg-gray-800 rounded">
          <h2 className="text-lg font-bold mb-2">Recommended Movies:</h2>
          {results.map((res, index) => (
            <p key={index} className="border-b border-gray-700 py-2">
              {res}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
