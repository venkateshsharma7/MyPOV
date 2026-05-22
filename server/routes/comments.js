import express from "express"

import jwt from "jsonwebtoken"

import { body, param } from "express-validator"

import Comment from "../models/Comment.js"

import Entry from "../models/Entry.js"

import User from "../models/User.js"

import auth from "../middleware/auth.js"

import validate from "../middleware/validate.js"

import { commentLimiter } from "../middleware/rateLimit.js"

const router = express.Router()

async function getRequestUser(req){

const authHeader = req.headers.authorization

if(!authHeader || !authHeader.startsWith("Bearer ")) return null

try{

const decoded = jwt.verify(

authHeader.split(" ")[1],

process.env.JWT_SECRET

)

const user = await User.findById(

decoded.id

)

.select("_id role")

.lean()

if(!user) return null

return {

id:user._id.toString(),
role:user.role || "user"

}

}catch{

return null

}

}

function canViewEntry(entry, viewer){

if(entry?.isPublic) return true

if(!viewer || !entry?.user) return false

return viewer.role === "admin" ||
entry.user.toString() === viewer.id

}



/* GET COMMENTS */

router.get(

"/:entryId",

[

param("entryId")

.isMongoId()

.withMessage("Invalid entry ID")

],

validate,

async(req,res)=>{

try{

const entry = await Entry.findById(

req.params.entryId

)

.select("user isPublic")

.lean()

const viewer = await getRequestUser(req)

if(!entry || !canViewEntry(entry, viewer)){

return res.status(404).json({

error:"Entry not found"

})

}

const page = Math.max(

1,

Number(req.query.page) || 1

)



const limit = Math.min(

50,

Number(req.query.limit) || 20

)



const skip = (page - 1) * limit



const query = {

entry:req.params.entryId

}



const total = await Comment.countDocuments(

query

)



const comments = await Comment.find(

query

)

.populate(

"user",

"username"

)

.sort({

createdAt:-1

})

.skip(skip)

.limit(limit)

.lean()



res.json({

comments,

pagination:{

page,

limit,

total,

pages:Math.ceil(total / limit),

hasMore:

skip + comments.length < total

}

})

}catch(err){

console.error(

"Comment fetch failed:",

err

)



res.status(500).json({

error:"Failed to fetch comments"

})

}

}

)



/* ADD COMMENT */

router.post(

"/:entryId",

auth,

commentLimiter,

[

param("entryId")

.isMongoId()

.withMessage("Invalid entry ID"),



body("text")

.trim()

.isLength({

min:1,

max:500

})

.withMessage(

"Comment must be 1-500 characters"

)

],

validate,

async(req,res)=>{

try{

const entry = await Entry.findById(

req.params.entryId

)

.select("user isPublic")

.lean()

if(!entry || !canViewEntry(entry, req.user)){

return res.status(404).json({

error:"Entry not found"

})

}

const text = req.body.text.trim()



const comment = await Comment.create({

user:req.user.id,

entry:req.params.entryId,

text

})



const populated = await comment.populate(

"user",

"username"

)



res.status(201).json(

populated

)

}catch(err){

console.error(

"Comment creation failed:",

err

)



res.status(500).json({

error:"Failed to add comment"

})

}

}

)



export default router
