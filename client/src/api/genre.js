const API = `${import.meta.env.VITE_API_URL}/tmdb`

export async function fetchGenres(){
  try {
    const res = await fetch(`${API}/genres`)
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.warn("Genre fetch failed:", data.error || res.statusText)
      return {}
    }

    return data || {}
  } catch (err) {
    console.warn("Genre fetch failed:", err)
    return {}
  }
}