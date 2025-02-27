"use client";

import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (action) => {
    if (!text.trim()) {
      setError("Please enter a movie title");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage("");

    try {
      console.log("Sending request:", { text, action });

      const response = await fetch("/api/pinecone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ text, action }),
      });

      // Log the raw response for debugging
      const rawResponse = await response.text();
      console.log("Raw response:", rawResponse);

      // Parse the response as JSON
      let data;
      try {
        data = JSON.parse(rawResponse);
      } catch (err) {
        console.error("Failed to parse response as JSON:", err);
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (action === "search") {
        setResults(data);
      } else if (action === "store") {
        setSuccessMessage(data.message || "Movie stored successfully!");
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "An error occurred");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">
        🎬 Movie Recommendation Engine
      </h1>

      <div className="w-full max-w-md">
        <input
          className="p-2 mb-4 w-full rounded bg-gray-800 border border-gray-700 text-white"
          type="text"
          placeholder="Enter a movie title..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex space-x-4 mb-4">
          <button
            className={`px-4 py-2 bg-blue-500 rounded flex-1 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => handleSubmit("store")}
            disabled={loading || !text.trim()}
          >
            {loading ? "Processing..." : "Store Movie"}
          </button>
          <button
            className={`px-4 py-2 bg-green-500 rounded flex-1 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => handleSubmit("search")}
            disabled={loading || !text.trim()}
          >
            {loading ? "Searching..." : "Get Recommendations"}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500 rounded mb-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-green-500/20 border border-green-500 rounded mb-4">
            <p className="text-green-300">{successMessage}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 w-full p-4 bg-gray-800 rounded">
            <h2 className="text-lg font-bold mb-2">Recommended Movies:</h2>
            {results.map((movie, index) => (
              <div
                key={index}
                className="border-b border-gray-700 py-3 last:border-b-0"
              >
                <h3 className="font-medium text-blue-300">{movie.title}</h3>
                <p className="text-sm text-gray-300 mt-1">
                  {movie.description}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Similarity: {(movie.score * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
