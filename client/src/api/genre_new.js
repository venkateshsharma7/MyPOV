const API = `${import.meta.env.VITE_API_URL}/tmdb`

export async function fetchGenres(){
try{
const res = await fetch(`${API}/genres`)

if(!res.ok){
const data = await res.json().catch(() => ({}))
console.warn(
"Genre fetch failed:",
data.error || res.statusText
)
return {}
}

return await res.json()
}catch(err){
console.warn("Genre fetch failed:", err)
return {}
}
}