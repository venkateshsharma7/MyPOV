const API = `${import.meta.env.VITE_API_URL}/auth`



async function request(

endpoint,

data

){

const res = await fetch(

`${API}${endpoint}`,

{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(data)

}

)



const result = await res.json()



if(!res.ok){

throw new Error(

result.error ||

result.message ||

"Request failed"

)

}



return result

}



/* REGISTER */

export async function register(data){

return request(

"/register",

data

)

}



/* LOGIN */

export async function login(data){

return request(

"/login",

data

)

}