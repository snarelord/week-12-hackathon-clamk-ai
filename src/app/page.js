"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [numResults, setNumResults] = useState(3); // Add state for number of results
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [storedMovies, setStoredMovies] = useState([]);

  const handleSubmit = async (action) => {
    if (!text.trim()) {
      setError("Please enter a movie title");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage("");
    setStoredMovies([]);

    try {
      const response = await fetch("/api/pinecone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          text,
          action,
          numResults: Number.parseInt(numResults), // Include numResults in the request
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (action === "search") {
        setResults(data);
      } else if (action === "store") {
        setSuccessMessage(data.message);
        setStoredMovies(data.movies || []);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "An error occurred");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const MovieCard = ({ movie }) => (
    <div className="group bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl relative z-10 hover:z-20">
      <div className="relative">
        {movie.rated && (
          <span className="absolute top-16 right-2 bg-black/60 px-2 py-1 rounded text-xs font-medium">
            {movie.rated}
          </span>
        )}
        {movie.imdbRating && (
          <div className=" bottom-2 right-2 bg-yellow-500/90 px-2 py-1 rounded text-xs font-bold text-black">
            ⭐ {movie.imdbRating}/10
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-lg text-blue-300">{movie.title}</h3>
          <span className="text-sm text-gray-400">{movie.year}</span>
        </div>

        {movie.genre && (
          <div className="flex flex-wrap gap-1 mb-2">
            {movie.genre.split(", ").map((genre, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-gray-700 rounded-full text-gray-300"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {movie.director && (
          <p className="text-sm text-gray-400 mb-2">
            Directed by {movie.director}
          </p>
        )}

        <p className="text-sm text-gray-300 mb-2 line-clamp-3 group-hover:line-clamp-none transition-height duration-300 overflow-hidden">
          {movie.plot}
        </p>

        {movie.score && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-xs text-green-400">
              Similarity: {(movie.score * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
  const VerticalScrollingImageBelt = ({ className, scrollSpeed }) => {
    const beltRef = useRef(null);
    const [beltHeight, setBeltHeight] = useState(0);
    const images = [
      {
        id: 1,
        src: "/inception.jpg",
        alt: "Custom image 1",
      },
      {
        id: 2,
        src: "/harrypotter.jpg",
        alt: "Custom image 2",
      },
      {
        id: 3,
        src: "/us.jpg",
        alt: "Custom image 3",
      },
      {
        id: 4,
        src: "/starwars.jpg",
        alt: "Custom image 4",
      },
      {
        id: 5,
        src: "/grandbudapesthotel.jpg",
        alt: "Custom image 4",
      },
    ];
    // 3x array of images so they repeat before looping
    // can remove with enough images if they don't need to repeat
    const extendedImages = [...images, ...images, ...images];
    useEffect(() => {
      const belt = beltRef.current;
      if (!belt || belt.children.length === 0) return;
      // total height
      let totalHeight = 0;
      const items = Array.from(belt.children);
      const calculateHeights = () => {
        totalHeight = 0;
        items.forEach((item) => {
          // 16px = 1rem
          totalHeight += item.offsetHeight + 16;
        });
        setBeltHeight(totalHeight / 3);
      };
      calculateHeights();
      //stackoverflow magic to fix resizing
      window.addEventListener("resize", calculateHeights);
      //load images
      setTimeout(calculateHeights, 500);
      return () => {
        window.removeEventListener("resize", calculateHeights);
      };
    }, []);
    useEffect(() => {
      const belt = beltRef.current;
      if (!belt || beltHeight === 0) return;
      let animationId;
      let position = 0;
      const speed = scrollSpeed; // ppf (pixels/frame)
      const scroll = () => {
        position -= speed;
        //create infinite loop
        if (position <= -beltHeight) {
          position += beltHeight;
        }
        belt.style.transform = `translateY(${position}px)`;
        animationId = requestAnimationFrame(scroll);
      };
      animationId = requestAnimationFrame(scroll);
      return () => {
        cancelAnimationFrame(animationId);
      };
    }, [beltHeight, scrollSpeed]);
    return (
      <div className={className}>
        <div className="relative h-full w-full overflow-hidden">
          <div
            ref={beltRef}
            className="absolute flex flex-col left-0 gap-4 will-change-transform p-0"
          >
            {extendedImages.map((image, index) => (
              <div
                key={`${image.id}-${index}`}
                className="flex-shrink-0 overflow-hidden shadow-lg"
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-50 w-40 object-cover block p-0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="min-h-screen p-10 bg-cyan-700 text-slate-100">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          🎬 Movie Recommendation Library
        </h1>
        <div className="mb-8">
          <h2 className="text-xl font-bold text-center mb-2">
            Step 1: Add Movies
          </h2>
          <p className="font-bold text-center mb-4">
            Type in a movie title. Click the Save my Movies button and we will
            search for and store the movies with related titles.
          </p>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-bold text-center mb-2">
            Step 2: Get Recommendations
          </h2>
          {/* // eslint-disable-next-line react/no-unescaped-entities */}
          <p className="font-bold text-center mb-4">
            When you want to make your choice, type in what your in the mood
            for, genre, year, or even just a key word and get your personalized
            recommendation!
          </p>
        </div>
        <div className="max-w-md mx-auto mb-8">
          <div className="flex gap-4 mb-4">
            <input
              className="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-white"
              type="text"
              placeholder="Search here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit("search");
                }
              }}
            />
            <select
              className="p-2 rounded bg-gray-800 border border-gray-700 text-white"
              value={numResults}
              onChange={(e) => setNumResults(Number(e.target.value))}
            >
              <option value="3">3 Results</option>
              <option value="10">10 Results</option>
              <option value="15">15 Results</option>
            </select>
          </div>

          <div className="flex space-x-4 mb-4">
            <button
              className={`px-4 py-2 bg-blue-500 rounded flex-1 ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-600 transition-colors"
              }`}
              onClick={() => handleSubmit("store")}
              disabled={loading || !text.trim()}
            >
              {loading ? "Processing..." : "Save my Movies"}
            </button>
            <button
              className={`px-4 py-2 bg-green-500 rounded flex-1 ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-green-600 transition-colors"
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
        </div>

        {results.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">
              Recommended Movies ({results.length} results):
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((movie, index) => (
                <MovieCard key={`result-${index}`} movie={movie} />
              ))}
            </div>
          </div>
        )}
          <VerticalScrollingImageBelt
          className={
            "fixed left-25 top-0 bottom-0 w-35 overflow-hidden h-screen"
          }
          scrollSpeed={0.5}
        />
        <VerticalScrollingImageBelt
          className={
            "fixed right-25 top-0 bottom-0 w-35 overflow-hidden h-screen"
          }
          scrollSpeed={0.51}
        />
        {storedMovies.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">
              Stored Movies ({storedMovies.length}):
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {storedMovies.map((movie, index) => (
                <MovieCard key={`stored-${index}`} movie={movie} />
              ))}
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}
