import { Pinecone } from "@pinecone-database/pinecone";
import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { NextResponse } from "next/server";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index(process.env.PINECONE_INDEX);

async function getEmbedding(text) {
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data.data[0].embedding;
}

async function fetchMovieData(movieTitle) {
  const response = await fetch(
    `http://www.omdbapi.com/?t=${encodeURIComponent(movieTitle)}&apikey=${
      process.env.OMDB_API_KEY
    }`
  );
  const data = await response.json();
  console.log("----------------------");
  console.log(data);
  console.log("----------------------");
  if (data.Response === "True") {
    return data.Plot;
  } else {
    throw new Error("Movie not found");
  }
}

export async function POST(req) {
  try {
    // Add error handling for JSON parsing
    const body = await req.text(); // Get raw request body as text

    // Check if body is empty
    if (!body) {
      return NextResponse.json(
        { error: "Request body is empty" },
        { status: 400 }
      );
    }

    // Try to parse the JSON
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: e.message },
        { status: 400 }
      );
    }

    const { text, action } = parsedBody;

    // Validate required fields
    if (!text) {
      return NextResponse.json(
        { error: "Missing required field: text" },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "Missing required field: action" },
        { status: 400 }
      );
    }

    if (action === "store") {
      try {
        // Fetch movie data from OMDb API
        const movieDescription = await fetchMovieData(text);

        // Generate embedding for movie description
        const embedding = await getEmbedding(movieDescription);

        // Store the movie in Pinecone with updated API
        await index.upsert([
          {
            id: Date.now().toString(),
            values: embedding,
            metadata: { title: text, description: movieDescription },
          },
        ]);

        return NextResponse.json(
          { message: "Movie stored successfully!" },
          { status: 200 }
        );
      } catch (error) {
        console.error("Error storing movie:", error);
        return NextResponse.json(
          { error: `Failed to fetch or store movie: ${error.message}` },
          { status: 500 }
        );
      }
    }

    if (action === "search") {
      try {
        // Generate embedding for the query
        const queryEmbedding = await getEmbedding(text);

        // Updated query format for Pinecone v5
        const results = await index.query({
          vector: queryEmbedding,
          topK: 5,
          includeMetadata: true,
        });

        return NextResponse.json(
          results.matches.map((match) => ({
            title: match.metadata.title || "Unknown Title",
            description: match.metadata.description,
            score: match.score,
          })),
          { status: 200 }
        );
      } catch (error) {
        console.error("Error searching movies:", error);
        return NextResponse.json(
          { error: `Failed to search movies: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: `Invalid action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Unexpected error in API route:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error.message },
      { status: 500 }
    );
  }
}
