const mongoose = require('mongoose')
const inputVariableSchema = new mongoose.Schema({
    _id:{
        type:Number
    },
    type:{
        type:String
    },
    name:{
        type:String
    },
    description:{
        type:String
    },
    allowed_values:{
        type:Array
    },
    createdDate:{
        type:String
    },
    createdBy:{
        type:String
    },
    updatedBy:{
        type:String
    },
    updatedDate:{
        type:String
    }
})
const InputVariable = mongoose.model('InputVariables',inputVariableSchema)
module.exports = InputVariable 