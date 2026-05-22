import natural from "natural"

const tokenizer = new natural.WordTokenizer()

const TfIdf = natural.TfIdf



const STOPWORDS = new Set([

"a",

"an",

"the",

"and",

"or",

"is",

"are",

"was",

"were",

"in",

"on",

"at",

"to",

"for",

"of",

"with",

"this",

"that",

"it",

"as",

"by",

"from"

])



export function textToVector(text){

if(

!text ||

typeof text !== "string"

){

return {}

}



/* NORMALIZE */

const cleaned = text

.toLowerCase()

.replace(/[^\w\s]/g," ")



/* TOKENIZE */

const tokens = tokenizer

.tokenize(cleaned)

.filter(token =>

token.length > 2

)

.filter(token =>

!STOPWORDS.has(token)

)



if(!tokens.length){

return {}

}



/* TF-IDF */

const tfidf = new TfIdf()

tfidf.addDocument(tokens)



const vector = {}



tfidf.listTerms(0)

.forEach(term => {

vector[term.term] = term.tfidf

})



return vector

}