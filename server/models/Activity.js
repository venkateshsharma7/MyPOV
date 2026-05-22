import mongoose from "mongoose"

const activitySchema = new mongoose.Schema(

{

user:{

type:mongoose.Schema.Types.ObjectId,

ref:"User",

required:true,

index:true

},



type:{

type:String,

enum:[

"log",

"review",

"pov"

],

required:true,

trim:true

},



entry:{

type:mongoose.Schema.Types.ObjectId,

ref:"Entry"

},



movieTitle:{

type:String,

trim:true,

maxlength:200

},



rating:{

type:Number,

min:0,

max:10

}

},

{

timestamps:true

}

)



/* INDEXES */

activitySchema.index({

createdAt:-1

})



activitySchema.index({

user:1,

createdAt:-1

})



export default mongoose.model(

"Activity",

activitySchema

)