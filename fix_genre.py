from pathlib import Path

# Update client genre helper
client_path = Path('c:/MyPOV/client/src/api/genre.js')
client_content = '''const API = `${import.meta.env.VITE_API_URL}/tmdb`

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
}'''
client_path.write_text(client_content, encoding='utf-8')

# Clean duplicate server OMDB route and ensure export default
server_path = Path('c:/MyPOV/server/routes/tmdb.js')
text = server_path.read_text(encoding='utf-8')
start = text.find('/* OMDB SEARCH */')
if start != -1:
    end = text.find('export default router', start)
    if end != -1:
        end += len('export default router')
        text = text[:start] + 'export default router'
server_path.write_text(text, encoding='utf-8')
print('updated')
