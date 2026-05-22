import jwt from "jsonwebtoken"
import User from "../models/User.js"

export default async function auth(

req,

res,

next

){

try{

const authHeader = req.headers.authorization



if(

!authHeader ||

!authHeader.startsWith("Bearer ")

){

return res.status(401).json({

error:"Authentication required"

})

}



const token = authHeader.split(" ")[1]



if(!token){

return res.status(401).json({

error:"Invalid token format"

})

}



const decoded = jwt.verify(

token,

process.env.JWT_SECRET

)

const user = await User.findById(decoded.id).lean()
if(!user){
return res.status(401).json({
error:"User not found"
})
}



/* ATTACH USER */

req.user = {

id:user._id.toString(),
role:user.role || "user"

}



next()

}catch(err){

console.error(

"Auth middleware error:",

err.message

)



return res.status(401).json({

error:"Invalid or expired token"

})

}

}