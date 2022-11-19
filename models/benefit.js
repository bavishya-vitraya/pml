const mongoose = require('mongoose')
const benefitSchema = new mongoose.Schema({
    _id:{
        type:Number
    },
    benefitsName:{
        type:String
    },
    benefitCode:{
        type:String
    },
    procedureCode:{
        type:String
    },
    diagnosisCode:{
        type:String
    },
    investigationCode:{
        type:String
    },
    productCode:{
        type:String
    },
    serviceCode:{
        type:String
    },
    category:{
        type:String
    },
    createdDate:{
        type:String
    },
    createdBy:{
        type:String
    },
    lastUpdatedDate:{
        type:String
    },
    lastUpdatedBy:{
        type:String
    }
})
const Benefit = mongoose.model('Benefits',benefitSchema)
module.exports = Benefit 


    
    
    
    
    
    