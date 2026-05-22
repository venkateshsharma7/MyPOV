export function getMoviePath(movie = {}) {
  const title = movie.title || movie.name || movie.movieTitle || "Untitled";
  if (String(movie.source || "").startsWith("tmdb") && title) {
    return `/movie/${encodeURIComponent(title)}?title=${encodeURIComponent(title)}`;
  }

  const key = movie.tmdbId || movie.imdbId || movie.movieId || movie.entryId || movie.id || movie._id || title;
  const encodedKey = encodeURIComponent(String(key));

  if (movie.tmdbId || movie.imdbId || movie.movieId || movie.entryId || movie.id) {
    return `/movie/${encodedKey}`;
  }

  return `/movie/${encodedKey}?title=${encodeURIComponent(title)}`;
}
