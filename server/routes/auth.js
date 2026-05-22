import express from "express"

import bcrypt from "bcrypt"

import jwt from "jsonwebtoken"

import { body } from "express-validator"

import User from "../models/User.js"

import validate from "../middleware/validate.js"

import { authLimiter } from "../middleware/rateLimit.js"

const router = express.Router()



/* REGISTER */

router.post(

"/register",

authLimiter,

[

body("username")

.trim()

.isLength({

min:3,

max:20

})

.withMessage(

"Username must be 3-20 characters"

),



body("email")

.trim()

.normalizeEmail()

.isEmail()

.withMessage(

"Valid email required"

),



body("password")

.isLength({

min:6

})

.withMessage(

"Password must be at least 6 characters"

),

body("adminCode").optional().isString(),

],

validate,

async(req,res)=>{

try{

const username = req.body.username.trim()

const email = req.body.email.toLowerCase().trim()

const password = req.body.password

const adminCode = String(req.body.adminCode || "").trim()

const role = adminCode && process.env.ADMIN_CODE && adminCode === process.env.ADMIN_CODE ? "admin" : "user"



const existingEmail = await User.findOne({

email

}).lean()



if(existingEmail){

return res.status(400).json({

error:"Email already in use"

})

}



const existingUsername = await User.findOne({

username

}).lean()



if(existingUsername){

return res.status(400).json({

error:"Username already taken"

})

}



const hashed = await bcrypt.hash(

password,

10

)



const user = await User.create({

username,

email,

password:hashed,

role

})

const token = jwt.sign(
  {
    id: user._id
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d"
  }
)

res.status(201).json({

user:{

id:user._id,

username:user.username,

email:user.email,

role:user.role

},

token

})

}catch(err){

console.error(

"Register failed:",

err

)



res.status(500).json({

error:"Register failed"

})

}

}

)



/* LOGIN */

router.post(

"/login",

authLimiter,

[

body("email")

.trim()

.normalizeEmail()

.isEmail()

.withMessage(

"Valid email required"

),



body("password")

.notEmpty()

.withMessage(

"Password required"

)

],

validate,

async(req,res)=>{

try{

const email = req.body.email

.toLowerCase()

.trim()



const password = req.body.password



const user = await User.findOne({

email

})



if(!user){

return res.status(401).json({

error:"Invalid credentials"

})

}



const valid = await bcrypt.compare(

password,

user.password

)



if(!valid){

return res.status(401).json({

error:"Invalid credentials"

})

}



const token = jwt.sign(

{

id:user._id

},

process.env.JWT_SECRET,

{

expiresIn:"7d"

}

)



res.json({

token,

user:{

id:user._id,

username:user.username,

email:user.email,

role:user.role

}

})

}catch(err){

console.error(

"Login failed:",

err

)



res.status(500).json({

error:"Login failed"

})

}

}

)



export default router
