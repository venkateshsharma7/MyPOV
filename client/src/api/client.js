const BASE_URL = import.meta.env.VITE_API_URL || "/api"



export async function apiFetch(

endpoint,

options = {}

){

const token = localStorage.getItem("token")



const headers = {

"Content-Type":"application/json",

...(options.headers || {})

}



if(token){

headers.Authorization = `Bearer ${token}`

}



const response = await fetch(

`${BASE_URL}${endpoint}`,

{

...options,

headers

}

)



let data = {}



try{

data = await response.json()

}catch{

data = {}

}



if(!response.ok){

throw new Error(

data.error ||

data.message ||

"Request failed"

)

}



return data

}
