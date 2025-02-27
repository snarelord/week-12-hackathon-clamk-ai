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

// Function to search movies from OMDB API
async function searchMovies(query) {
  const response = await fetch(
    `http://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${
      process.env.OMDB_API_KEY
    }`
  );
  const data = await response.json();
  console.log(data);

  if (data.Response === "True") {
    return data.Search.slice(0, 5); // Get first 5 movies
  }
  throw new Error("No movies found");
}

// Update the fetchMovieDetails function to include the specific fields
async function fetchMovieDetails(imdbId) {
  const response = await fetch(
    `http://www.omdbapi.com/?i=${imdbId}&apikey=${process.env.OMDB_API_KEY}`
  );
  const data = await response.json();

  if (data.Response === "True") {
    return {
      title: data.Title,
      year: data.Year,
      rated: data.Rated,
      plot: data.Plot,
      genre: data.Genre,
      director: data.Director,
      imdbRating: data.imdbRating,
      imdbId: data.imdbID,
    };
  }
  throw new Error(`Movie details not found for ID: ${imdbId}`);
}

// Update the storeMovieInPinecone function to include the new fields
async function storeMovieInPinecone(movieData) {
  const movieDescription = `${movieData.title} (${movieData.year}). ${movieData.plot} 
    Directed by ${movieData.director}. Genres: ${movieData.genre}. Rated ${movieData.rated}. IMDB Rating: ${movieData.imdbRating}/10`;

  const embedding = await getEmbedding(movieDescription);

  await index.upsert([
    {
      id: movieData.imdbId,
      values: embedding,
      metadata: {
        title: movieData.title,
        year: movieData.year,
        rated: movieData.rated,
        plot: movieData.plot,
        genre: movieData.genre,
        director: movieData.director,
        imdbRating: movieData.imdbRating,
        description: movieDescription,
      },
    },
  ]);

  return movieData;
}

export async function POST(req) {
  try {
    const body = await req.text();

    if (!body) {
      return NextResponse.json(
        { error: "Request body is empty" },
        { status: 400 }
      );
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: e.message },
        { status: 400 }
      );
    }

    const { text, action, numResults = 25 } = parsedBody; // Add numResults parameter with default value

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
        // Search for movies related to the query
        const movies = await searchMovies(text);
        const storedMovies = [];

        // Fetch details and store each movie
        for (const movie of movies) {
          try {
            const movieDetails = await fetchMovieDetails(movie.imdbID);
            const storedMovie = await storeMovieInPinecone(movieDetails);
            storedMovies.push(storedMovie);
          } catch (error) {
            console.error(`Error processing movie ${movie.Title}:`, error);
            // Continue with other movies even if one fails
          }
        }

        return NextResponse.json(
          {
            message: `Successfully stored ${storedMovies.length} movies!`,
            movies: storedMovies,
          },
          { status: 200 }
        );
      } catch (error) {
        console.error("Error storing movies:", error);
        return NextResponse.json(
          { error: `Failed to fetch or store movies: ${error.message}` },
          { status: 500 }
        );
      }
    }

    if (action === "search") {
      try {
        const queryEmbedding = await getEmbedding(text);

        // Use the numResults parameter in the query
        const results = await index.query({
          vector: queryEmbedding,
          topK: Number.parseInt(numResults), // Convert to integer and use in query
          includeMetadata: true,
        });

        return NextResponse.json(
          results.matches.map((match) => ({
            title: match.metadata.title,
            year: match.metadata.year,
            rated: match.metadata.rated,
            plot: match.metadata.plot,
            genre: match.metadata.genre,
            director: match.metadata.director,
            imdbRating: match.metadata.imdbRating,
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
