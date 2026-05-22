import express from "express"

import Entry from "../models/Entry.js"

const router = express.Router()



router.get(

"/",

async(req,res)=>{

try{

const trending = await Entry.aggregate([



/* PUBLIC ONLY */

{

$match:{

isPublic:true,

tmdbId:{

$ne:null

}

}

},



/* GROUP */

{

$group:{

_id:"$tmdbId",



title:{

$first:"$title"

},



poster:{

$first:"$poster"

},



reviews:{

$sum:1

},



avgRating:{

$avg:"$rating"

}

}

},



/* SCORE */

{

$addFields:{

score:{

$add:[

"$reviews",

{

$multiply:[

"$avgRating",

0.5

]

}

]

}

}

},



/* SORT */

{

$sort:{

score:-1,

reviews:-1

}

},



/* LIMIT */

{

$limit:12

},



/* CLEAN OUTPUT */

{

$project:{

_id:1,

title:1,

poster:1,

reviews:1,

avgRating:{

$round:[

"$avgRating",

1

]

}

}

}

])



res.json(trending)

}catch(err){

console.error(

"Trending fetch failed:",

err

)



res.status(500).json({

error:"Trending fetch failed"

})

}

}

)



export default router