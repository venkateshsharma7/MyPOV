import express from "express"

import mongoose from "mongoose"

import cors from "cors"

import dotenv from "dotenv"

import helmet from "helmet"



import entryRoutes from "./routes/entries.js"

import recommendationRoutes from "./routes/recommendations.js"

import authRoutes from "./routes/auth.js"

import userRoutes from "./routes/users.js"

import activityRoutes from "./routes/activity.js"

import trendingRoutes from "./routes/trending.js"

import commentRoutes from "./routes/comments.js"

import tmdbRoutes from "./routes/tmdb.js"

import adminRoutes from "./routes/admin.js";
import aiRoutes from "./routes/ai.js";
import spaceRoutes from "./routes/spaces.js";




dotenv.config()

const REQUIRED_ENV = [
  "MONGO_URI",
  "JWT_SECRET",
  "OMDB_KEY",
  "TMDB_KEY",
  "CLIENT_URL",
]

const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key])

if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`)
  process.exit(1)
}

if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters in production")
  process.exit(1)
}



const app = express()

const allowedOrigins = process.env.CLIENT_URL
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)



/* SECURITY */

app.use(

helmet()

)



/* CORS */

app.use(

cors({

origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, true)
  }

  return callback(new Error("Not allowed by CORS"))
},

credentials:true

})

)



/* BODY PARSER */

app.use(

express.json({

limit:"1mb"

})

)



/* ROUTES */

app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/spaces", spaceRoutes);


app.use(

"/api/auth",

authRoutes

)



app.use(

"/api/entries",

entryRoutes

)



app.use(

"/api/recommendations",

recommendationRoutes

)



app.use(

"/api/users",

userRoutes

)



app.use(

"/api/activity",

activityRoutes

)



app.use(

"/api/trending",

trendingRoutes

)



app.use(

"/api/comments",

commentRoutes

)



app.use(

"/api/tmdb",

tmdbRoutes

)



/* HEALTH */

app.get(

"/",

(req,res)=>{

res.send(

"MyPOV API running"

)

app.get(

"/api/health",

(req,res)=>{

res.json({

status:"ok",
service:"mypov-api",
timestamp:new Date().toISOString()

})

}

)

}

)



/* 404 */

app.use((req,res)=>{

res.status(404).json({

error:"Route not found"

})

})



/* ERROR HANDLER */

app.use((err,req,res,next)=>{

console.error(

"Server error:",

err

)



res.status(500).json({

error:"Internal server error"

})

})



/* DATABASE */

mongoose.connect(

process.env.MONGO_URI,

{

autoIndex:true

}

)

.then(()=>{

console.log(

"MongoDB connected"

)



app.listen(

process.env.PORT || 5000,

()=>{

console.log(

`Server running on port ${
process.env.PORT || 5000
}`

)

}

)

})

.catch(err=>{

console.error(

"MongoDB connection failed:",

err

)

})
