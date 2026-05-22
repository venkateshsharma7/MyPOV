export function cosineSimilarity(

vecA,

vecB

){

if(

!vecA ||

!vecB

){

return 0

}



const keysA = Object.keys(vecA)



if(!keysA.length){

return 0

}



let dot = 0

let magA = 0

let magB = 0



/* VECTOR A */

for(const key of keysA){

const a = Number(vecA[key]) || 0

const b = Number(vecB[key]) || 0



dot += a * b

magA += a * a

}



/* VECTOR B */

for(const key in vecB){

const value = Number(vecB[key]) || 0

magB += value * value

}



/* MAGNITUDES */

magA = Math.sqrt(magA)

magB = Math.sqrt(magB)



if(

!magA ||

!magB

){

return 0

}



/* COSINE */

return dot / (magA * magB)

}