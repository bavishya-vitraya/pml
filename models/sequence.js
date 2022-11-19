const mongoose = require('mongoose')
const sequenceSchema = new mongoose.Schema({
    _id:{
        type:String
    },
    seq:{
        type:Number
    }
})
const Sequence = mongoose.model('sequences',sequenceSchema)
module.exports = Sequence 