import natural from "natural"

import {

textToVector

} from "./embeddingService.js"

const tokenizer = new natural.WordTokenizer()

const stemmer = natural.PorterStemmer

const stopwords = new Set(

natural.stopwords

)

function getGenreName(genre){

if(typeof genre === "string"){

return genre.trim()

}

if(genre && typeof genre === "object"){

return String(

genre.name ||
genre.id ||
""

).trim()

}

return ""

}



export function buildTasteProfile(

entries

){

const genreScore = {}

const keywordScore = {}



entries.forEach(entry => {



/* WEIGHT */

const rating = Number(

entry?.rating || 0

)



let weight = rating



if(rating >= 8){

weight += 3

}



if(rating >= 9){

weight += 2

}



if(entry?.pov){

weight += 3

}



/* REVIEW */

const reviewText =

typeof entry?.review === "string"

? entry.review

: ""



/* TOKENIZE */

let tokens = []



try{

tokens = tokenizer.tokenize(

reviewText.toLowerCase()

)

}catch{

tokens = []

}



/* PROCESS TOKENS */

tokens

.filter(Boolean)

.forEach(word => {

let token = String(word)

.toLowerCase()

.replace(/[^\w]/g,"")



if(

!token ||

stopwords.has(token) ||

token.length < 4

){

return

}



/* STEM */

token = stemmer.stem(

token

)



keywordScore[token] =

(keywordScore[token] || 0)

+ weight

})



/* GENRES */

const genres = Array.isArray(

entry?.genres

)

? entry.genres

: []



genres.forEach(g => {

const genreName = getGenreName(g)

if(!genreName){

return

}

genreScore[genreName] =

(genreScore[genreName] || 0)

+ weight

})



})



return {

genreScore,

keywordScore

}

}



/* USER VECTOR */

export function buildUserVector(

entries

){

const combinedText = entries

.map(e =>

typeof e?.review === "string"

? e.review

: ""

)

.join(" ")



return textToVector(

combinedText

)

}
