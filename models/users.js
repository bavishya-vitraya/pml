const mongoose = require('mongoose')
const userSchema = new mongoose.Schema({
    _id:{
        type:Number
    },
    name:{
        type:String
    },
    email:{
        type:String
    },
    password:{
        type:String
    },
    active:{
        type:String
    },
    organization:{
        type:String
    }
});
const User = mongoose.model('Users',userSchema)
module.exports = User 