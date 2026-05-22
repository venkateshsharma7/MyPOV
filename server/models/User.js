import mongoose from "mongoose"

const userSchema = new mongoose.Schema(

{

username:{

type:String,

required:true,

unique:true,

trim:true,

minlength:3,

maxlength:20

},



email:{

type:String,

required:true,

unique:true,

trim:true,

lowercase:true

},



password:{

type:String,

required:true

},



role:{

type:String,

enum:["user","admin"],

default:"user"

},



followers:[{

type:mongoose.Schema.Types.ObjectId,

ref:"User"

}],



following:[{

type:mongoose.Schema.Types.ObjectId,

ref:"User"

}]

},

{

timestamps:true

}

)



export default mongoose.model(

"User",

userSchema

)