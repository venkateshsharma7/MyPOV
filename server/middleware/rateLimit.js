import rateLimit from "express-rate-limit"



function createLimiter({

windowMs,

max,

message

}){

return rateLimit({

windowMs,

max,

standardHeaders:true,

legacyHeaders:false,

message:{
error:message
},

skipSuccessfulRequests:false

})

}



/* AUTH LIMITER */

export const authLimiter = createLimiter({

windowMs:15 * 60 * 1000,

max:10,

message:"Too many login attempts. Try again later."

})



/* COMMENT LIMITER */

export const commentLimiter = createLimiter({

windowMs:5 * 60 * 1000,

max:20,

message:"Too many comments. Slow down."

})



/* GENERAL ACTION LIMITER */

export const actionLimiter = createLimiter({

windowMs:5 * 60 * 1000,

max:50,

message:"Too many requests. Please try again later."

})
