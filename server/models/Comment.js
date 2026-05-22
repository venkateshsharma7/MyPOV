import mongoose from "mongoose"

const commentSchema = new mongoose.Schema(

{

user:{

type:mongoose.Schema.Types.ObjectId,

ref:"User",

required:true

},



entry:{

type:mongoose.Schema.Types.ObjectId,

ref:"Entry",

required:true

},



text:{

type:String,

required:true,

trim:true,

minlength:1,

maxlength:500

}

},

{

timestamps:true

}

)



/* INDEXES */

commentSchema.index({

entry:1,

createdAt:-1

})



commentSchema.index({

user:1

})



export default mongoose.model(

"Comment",

commentSchema

)