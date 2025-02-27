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
  environment: process.env.PINECONE_ENV,
});

const index = pinecone.Index(process.env.PINECONE_INDEX);

// Function to generate embeddings
async function getEmbedding(text) {
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data.data[0].embedding;
}

// Function to fetch movie data from OMDb API
async function fetchMovieData(movieTitle) {
  const response = await fetch(
    `http://www.omdbapi.com/?i=tt3896198&apikey=a7fe8d0b`
  );
  const data = await response.json();
  if (data.Response === "True") {
    return data.Plot; // Return the movie description/plot
  } else {
    throw new Error("Movie not found");
  }
}

export async function POST(req) {
  const { text, action } = await req.json();

  if (action === "store") {
    try {
      // Fetch movie data from OMDb API
      const movieDescription = await fetchMovieData(text);

      // Generate embedding for movie description
      const embedding = await getEmbedding(movieDescription);

      // Store the movie in Pinecone
      await index.upsert([
        {
          id: Date.now().toString(),
          values: embedding,
          metadata: { text: movieDescription },
        },
      ]);

      return NextResponse.json(
        { message: "Movie stored successfully!" },
        { status: 200 }
      );
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to fetch or store movie" },
        { status: 500 }
      );
    }
  }

  if (action === "search") {
    // Perform a similarity search
    const queryEmbedding = await getEmbedding(text);
    const results = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    return NextResponse.json(
      results.matches.map((match) => match.metadata.text),
      { status: 200 }
    );
  }

  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
