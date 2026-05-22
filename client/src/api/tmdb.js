const API = `${import.meta.env.VITE_API_URL}/tmdb`



export async function searchMovies(query){

const res = await fetch(

`${API}/search?q=${encodeURIComponent(query)}`

)



let data = {}



try{

data = await res.json()

}catch{

data = {}

}



if(!res.ok){

throw new Error(

data.error ||

"Failed to search movies"

)

}



return data

}