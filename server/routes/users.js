import express from "express"

import jwt from "jsonwebtoken"

import User from "../models/User.js"

import Entry from "../models/Entry.js"

import auth from "../middleware/auth.js"

import { buildTasteProfile } from "../services/recommendationEngine.js"

const router = express.Router()



/* USER PROFILE */

router.get(

"/:username",

async(req,res)=>{

try{

const username =

req.params.username.trim()



/* FIND USER */

const user = await User.findOne({

username

})

.lean()



if(!user){

return res.status(404).json({

error:"User not found"

})

}



/* PUBLIC REVIEWS */

const reviews = await Entry.find({

user:user._id,

isPublic:true

})

.populate(

"user",

"username"

)

.sort({

createdAt:-1

})

.limit(50)

.lean()



/* STATS */

const totalReviews = reviews.length



const avgRating = totalReviews

? (

reviews.reduce(

(sum,r)=>

sum + (r.rating || 0),

0

)

/

totalReviews

).toFixed(1)

: 0



/* OPTIONAL AUTH */

let isFollowing = false



const authHeader =

req.headers.authorization



if(

authHeader &&

authHeader.startsWith("Bearer ")

){

try{

const token = authHeader.split(" ")[1]



const decoded = jwt.verify(

token,

process.env.JWT_SECRET

)



const currentUserId =

decoded.id



isFollowing =

user.followers.some(

id =>

id.toString()

===

currentUserId

)

}catch{

isFollowing = false

}

}



/* RESPONSE */

res.json({

user:{

username:user.username,

createdAt:user.createdAt,

followers:

user.followers.length,

following:

user.following.length

},



stats:{

totalReviews,

avgRating

},



reviews,



isFollowing

})

}catch(err){

console.error(

"Profile fetch failed:",

err

)



res.status(500).json({

error:"Profile fetch failed"

})

}

}

)



/* FOLLOW / UNFOLLOW */

router.post(

"/:username/follow",

auth,

async(req,res)=>{

try{

const targetUser = await User.findOne({

username:req.params.username

})



if(!targetUser){

return res.status(404).json({

error:"User not found"

})

}



const currentUser = await User.findById(

req.user.id

)



if(

!currentUser

){

return res.status(404).json({

error:"Current user not found"

})

}



/* PREVENT SELF FOLLOW */

if(

currentUser._id.equals(

targetUser._id

)

){

return res.status(400).json({

error:"Cannot follow yourself"

})

}



/* CHECK */

const alreadyFollowing =

currentUser.following.some(

id =>

id.toString()

===

targetUser._id.toString()

)



if(alreadyFollowing){

/* UNFOLLOW */

currentUser.following =

currentUser.following.filter(

id =>

id.toString()

!==

targetUser._id.toString()

)



targetUser.followers =

targetUser.followers.filter(

id =>

id.toString()

!==

currentUser._id.toString()

)

}else{

/* FOLLOW */

if(

!currentUser.following.includes(

targetUser._id

)

){

currentUser.following.push(

targetUser._id

)

}



if(

!targetUser.followers.includes(

currentUser._id

)

){

targetUser.followers.push(

currentUser._id

)

}

}



await Promise.all([

currentUser.save(),

targetUser.save()

])



res.json({

following:!alreadyFollowing,

followersCount:

targetUser.followers.length

})

}catch(err){

console.error(

"Follow failed:",

err

)



res.status(500).json({

error:"Follow failed"

})

}

}

)



/* TASTE DNA / PERSONALITY PROFILE */

router.get(

"/:username/taste-dna",

auth,

async(req,res)=>{

try{

const username =

req.params.username.trim()



/* FIND USER */

const user = await User.findOne({

username

})

.lean()



if(!user){

return res.status(404).json({

error:"User not found"

})

}

const canViewPrivateTaste =
req.user.role === "admin" ||
user._id.toString() === req.user.id

if(!canViewPrivateTaste){

return res.status(403).json({

error:"You can only view your own private Taste DNA"

})

}



/* GET ALL ENTRIES (PUBLIC & PRIVATE) */

const entries = await Entry.find({

user:user._id

})

.lean()



/* BUILD TASTE PROFILE */

const tasteProfile =

buildTasteProfile(entries)



/* PROCESS GENRES */

const genreArray = Object

.entries(tasteProfile.genreScore)

.map(([genre,score])=>({

name:genre,

score

}))

.sort((a,b)=>

b.score - a.score

)

.slice(0,10)



/* TOTAL GENRE SCORE */

const totalGenreScore =

genreArray.reduce(

(sum,g)=>sum + g.score,

0

)



/* CALCULATE PERCENTAGES */

const genrePercentages =

genreArray.map(g=>({

name:g.name,

percentage:

totalGenreScore > 0

? Math.round(

(g.score/totalGenreScore)*100

)

: 0,

score:g.score

}))



/* PROCESS KEYWORDS */

const keywordArray = Object

.entries(

tasteProfile.keywordScore

)

.map(([keyword,score])=>({

name:keyword,

score

}))

.sort((a,b)=>

b.score - a.score

)

.slice(0,15)



/* TOTAL KEYWORD SCORE */

const totalKeywordScore =

keywordArray.reduce(

(sum,k)=>sum + k.score,

0

)



/* CALCULATE PERCENTAGES */

const keywordPercentages =

keywordArray.map(k=>({

name:k.name,

percentage:

totalKeywordScore > 0

? Math.round(

(k.score/totalKeywordScore)*100

)

: 0,

score:k.score

}))



res.json({

username:user.username,

genreProfile:genrePercentages,

keywordProfile:keywordPercentages,

totalEntries:entries.length,

stats:{

avgRating:entries.length

? (

entries.reduce(

(sum,e)=>

sum + (e.rating || 0),

0

)/

entries.length

).toFixed(1)

: 0

}

})

}catch(err){

console.error(

"Taste DNA fetch failed:",

err

)



res.status(500).json({

error:"Taste DNA fetch failed"

})

}

}

)



export default router
