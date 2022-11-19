const {MongoClient} = require('mongodb')
const uri = "mongodb://localhost:27017"
const client = new MongoClient(uri); 
const inputVars = require('./inputVariableDetails.json')
const reassure = require('./pmlconf/ReAssure-2022-08-23-9.pml.json')
const healthcompanion = require('./pmlconf/HealthCompanion-2022-08-23-5.pml.json')
const heartbeat = require('./pmlconf/HeartBeat-2022-08-23-2.pml.json')
const insertProducts = [reassure,healthcompanion,heartbeat]
const inputBenefits = require('./benefits.json')
let prdseq = 0,inputvarseq = 0,inputbenefitseq = 0
async function insertProduct () {
    try{
        const db = client.db("pml")
        const products = db.collection("products")
        for (let product of insertProducts){
            product["_id"] = ++prdseq
            product["version"] = "v1"
            product["createdDate"] = new Date().toLocaleString('en-UK')
            product["createdBy"] = "bavishya_pml"
            product["updatedBy"] = "bavishya_pml"
            product["updatedDate"] = new Date().toLocaleString('en-UK')
            console.log(product)
            const res = await products.insertOne(product)
        }
        console.log("product insert done")
    }
    catch(err){
        console.log(`${err}`)
    }
}
async function insertInputVar () {
    try{
        const db = client.db("pml")
        const inputVariables = db.collection("inputvariables")
        for (let inputvar of inputVars){
            inputvar["_id"] = ++inputvarseq
            inputvar["createdDate"] = new Date().toLocaleString('en-UK')
            inputvar["createdBy"] = "bavishya_pml"
            inputvar["updatedBy"] = "bavishya_pml"
            inputvar["updatedDate"] = new Date().toLocaleString('en-UK')
            console.log(inputvar)
            const res = await inputVariables.insertOne(inputvar)
        }
        console.log("inputvar insert done")
    }
    catch(err){
        console.log(`${err}`)
    }
}
async function insertBenefits () {
    try{
        const db = client.db("pml")
        const benefits = db.collection("benefits")
        for (let benefit of inputBenefits){
            benefit["_id"] = ++inputbenefitseq
            benefit["createdDate"] = new Date().toLocaleString('en-UK')
            benefit["createdBy"] = "bavishya_pml"
            benefit["updatedBy"] = "bavishya_pml"
            benefit["updatedDate"] = new Date().toLocaleString('en-UK')
            console.log(benefit)
            const res = await benefits.insertOne(benefit)
        }
        console.log("Benefit insert done")
    }
    catch(err){
        console.log(`${err}`)
    }
}
//insertProduct()
//insertInputVar()
insertBenefits()