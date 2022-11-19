const mongoose = require('mongoose')
const productAuditSchema = new mongoose.Schema({
    _id:{
        type:Number
    },
    event:{
        type:String
    },
    eventHistory:{
        type:String
    }
})
const ProductAudit = mongoose.model('ProductAudits',productAuditSchema)
module.exports = ProductAudit 