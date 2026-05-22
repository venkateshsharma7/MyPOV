const API = `${import.meta.env.VITE_API_URL}/tmdb`



export async function searchOMDB(query){

const res = await fetch(

`${API}/omdb?q=${encodeURIComponent(query)}`

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

"OMDB search failed"

)

}



return data

}