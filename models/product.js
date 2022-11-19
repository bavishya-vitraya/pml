const mongoose = require('mongoose')
const limitSchema = new mongoose.Schema({
    limitAmountExpression:{type:String},
    limitType:{type:String},
    limitCondition:{type:String}
},{ _id : false })
const waitingPeriodsSchema = new mongoose.Schema({
    waitingPeriod:{type:String},
    waitingPeriodCondition:{type:String}
},{ _id : false })
const coveredIfSchema = new mongoose.Schema({
    ruleCode:{type:String},
    ruleDisplayText:{type:String},
    ruleCondition:{type:String}
},{ _id : false })
const benefitSchema = new mongoose.Schema({
    limits:[limitSchema],
    waitingPeriods:[waitingPeriodsSchema],
    coveredIf:[coveredIfSchema],
    excludedUnless:[coveredIfSchema],
    inputVariables:{
        type:Array
    },
    benefitType:{
        type:String
    },
    benefitCodes:{
        type:Array
    },
    benefitName:{
        type:String
    },
    covered:{
        type:Boolean
    } 
},{ _id : false })
const renewalHistorySchema = new mongoose.Schema({
    renewedBy:{
        type:String
    },
    renewedDate:{
        type:String
    },
    lastEffectiveDate:{
        type:String
    },
    lastExpirationDate:{
        type:String
    }
},{ _id : false })
const productSchema = new mongoose.Schema({
    _id:{
        type:Number
    },
    productCode:{
        type:String
    },
    status:{
        type:String
    },
    name:{
        type:String
    },
    defaultWaitingPeriod:[waitingPeriodsSchema],
    defaultWaitingPeriodForPEDs:[waitingPeriodsSchema],
    benefitDetails:{
        INPATIENT:[benefitSchema],
        ACCIDENT:[benefitSchema],
        ALTERNATIVE:[benefitSchema],
        DAYCARE:[benefitSchema],
        DOMICILARY:[benefitSchema],
        HEALTHCHECK:[benefitSchema],
        HOMECARE:[benefitSchema]
    },
    version:{
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
    },
    active:{
        type:String
    },
    deActivatedBy:{
        type:String
    },
    deActivatedDate:{
        type:String
    },
    approved:{
        type:String
    },
    approvedBy:{
        type:String
    },
    approvedDate:{
        type:String
    },
    archive:{
        type:String
    },
    archivedBy:{
        type:String
    },
    archivedDate:{
        type:String
    },
    renewedBy:{
        type:String
    },
    renewedDate:{
        type:String
    },
    renewalHistory:[renewalHistorySchema],
    lockStatus:{
        type:String
    },
    effectiveDate:{
        type:String
    },
    expirationDate:{
        type:String
    },
    issuer:{
        type:String
    },
    UIN:{
        type:String,
    },
    type:{
        type:String
    },
    category:{
        type:String
    },
    url:{
        type:String
    },
    defaultCopay:{
        type:String
    },
    versionedBy:{
        type:String
    },
    versionedDate:{
        type:String
    },
    allowedSumInsured:{
        type:Array
    }
})
const Product = mongoose.model('Products',productSchema)
module.exports = Product 