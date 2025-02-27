import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const openai = OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX);

// Function to generate embeddings
async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    input: text,
    model: "text-embedding-ada-002",
  });
  return response.data[0].embedding;
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

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { text, action } = req.body;

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

        return res.status(200).json({ message: "Movie stored successfully!" });
      } catch (error) {
        return res
          .status(500)
          .json({ error: "Failed to fetch or store movie" });
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

      return res
        .status(200)
        .json(results.matches.map((match) => match.metadata.text));
    }
  }

  res.status(405).json({ error: "Method Not Allowed" });
}
