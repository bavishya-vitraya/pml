// Requiring module
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt-nodejs')
const passport = require('passport')
const dotenv = require('dotenv')
require('./config/passport')(passport)
/*const reassurePolicy = require("./pmlconf/ReAssure-2022-08-23-9.pml.json")
const healthCompanionPolicy = require("./pmlconf/HealthCompanion-2022-08-23-5.pml.json")
const heartBeatPolicy = require("./pmlconf/HeartBeat-2022-08-23-2.pml.json")
const inputVariableDetails = require("./inputVariableDetails.json")*/

const Product = require('./models/product')
const User = require('./models/users')
const fhirpath = require('fhirpath')
const InputVariable = require('./models/inputVariables')
const ProductAudit = require('./models/productAudit')
const Sequence = require('./models/sequence')
const { throws } = require('assert')
const Benefit = require('./models/benefit')
// For FHIR model data (choice type support) pull in the model file:
//const fhirpath_r4_model = require('fhirpath/fhir-context/r4')

dotenv.config();
// Creating express object
const app = express()

// Handling GET request
app.get('/', (req, res) => {
	res.send({name: "Vitraya PML Service", version: "v1.0.0"})
	res.end()
})

// Port Number
const PORT = process.env.PORT || 6001
const CONNECT_URI = process.env.CONNECT_URI || "mongodb://localhost:27017/pml"
const secret = process.env.JWT_SECRET || "Zr4u7x!A%D*G-KaPdRgUkXp2s5v8y/B?"

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

mongoose.connect(CONNECT_URI,{
	useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
	console.log("Database connection established successfully")
}).catch((err) => {
	`Error:${err},did not connect to database`
})
/*const products = {
	"NIVABUPA_REASSURE": reassurePolicy,
	"NIVABUPA_HEALTHCOMPANION": healthCompanionPolicy,
	"NIVABUPA_HEARTBEAT": heartBeatPolicy
}*/
app.post('/addBenefit',passport.authenticate('admin-rule',{session:false}), async (req,res) => {
	let errors = [],result = {}
	const input = req.body
	let benefitExist = false
	await Benefit.findOne({$and:[{'benefitsName':input.benefitsName},{'benefitCode':input.benefitCode}]})
	.then((benefit) => {
		if(benefit !== null)
			benefitExist = true
	})
	if(!benefitExist){
		let benefitId = await Sequence.findByIdAndUpdate({_id:'benefitId'},{$inc:{'seq':1}})
		.then((seq)=>{
			console.log(seq)
			return seq
		})
		.catch((err) => errors.push(`Error in getting product sequence number:${err}`))
		const newBenefit = new Benefit(input)
		newBenefit._id = benefitId
		newBenefit.createdBy = input.userName
		newBenefit.lastUpdatedBy = input.userName
		newBenefit.createdDate = new Date().toLocaleString('en-UK')
		newBenefit.lastUpdatedDate = new Date().toLocaleString('en-UK')
		console.log(newBenefit)
		await newBenefit.save().then(async() => {
			result["benefit"] = newBenefit
			const prdAudit = new ProductAudit({
				event:"addBenefit",
				eventHistory:`New Benefit added by ${userName}`
			})
			let prdAuditId = await Sequence.findByIdAndUpdate({_id:'auditId'},{$inc:{'seq':1}})
				.then((seq)=>
				{
					console.log(seq)
					return seq
				})
				.catch((err) => errors.push(`Error in getting product audit sequence number:${err}`))
			prdAudit._id = prdAuditId.seq
			console.log(prdAudit)
			await prdAudit.save()
				.then(()=>console.log('audit successful'))
				.catch((err)=>errors.push(`Error:${err},audit save failed`))

		}).catch((err) => errors.push(`Error:${err},Cannot add Benefit`))
	}
	else
		errors.push(`Error:Benefit already exist`)

	if (errors.length) {
		res.status = 500
		result["errors"] = errors
	}
	res.json(result)
})
app.post('/createBenefit',passport.authenticate('admin-rule',{session:false}), async (req,res) => {
	let errors = [],result = {}
	const {product_code,version,benefit_category,userName,...input} = req.body
	console.log(input)
	let benefitExist = false
	await Product.findOne({$and:[{'productCode':product_code},{'version':version}]})
	.then(async (product) => {
		if(product !== null){
			let versionedProduct = await versionProduct(product,userName)
			let benefits = versionedProduct.benefitDetails[benefit_category]
			let newBenefit = input
			for(let benefit of benefits){
				if(newBenefit.benefitCodes.every((val,i)=> val === benefit.benefitCodes[i])){
					console.log(benefit.benefitCodes)
					console.log(newBenefit.benefitCodes)
					benefitExist = true
					break;
				}
			}
			console.log(benefitExist)
			if(!benefitExist){
				benefits.push(newBenefit)
				versionedProduct.benefitDetails[benefit_category] = benefits
				versionedProduct.lastUpdatedDate = new Date().toLocaleString('en-UK')
				await versionedProduct.save()
				.then(async () =>{
					result["benefit"]=newBenefit
					const prdAudit = new ProductAudit({
						event:"createBenefit",
						eventHistory:`Benefit added for ${product.productCode} with ${benefit_category}:${newBenefit} by ${userName}`
					})
					let prdAuditId = await Sequence.findByIdAndUpdate({_id:'auditId'},{$inc:{'seq':1}})
						.then((seq)=>
						{
							console.log(seq)
							return seq
						})
						.catch((err) => errors.push(`Error in getting product audit sequence number:${err}`))
					prdAudit._id = prdAuditId.seq
					console.log(prdAudit)
					await prdAudit.save()
						.then(()=>console.log('audit successful'))
						.catch((err)=>errors.push(`Error:${err},audit save failed`))
				})
				.catch((err) => errors.push(`Error in creating benefit:${err}`))
			}
			else
				errors.push(`Benefit already exists`)
		}
		else{
			throw "Invalid product Code or Input Version"
		}
	}).catch((err) => errors.push(`Error:${err},Could not find product with product_code:${productid}`))
	if (errors.length) {
		res.status = 500
		result["errors"] = errors
	}
	res.json(result)
});
app.post('/getBenefit',passport.authenticate('admin-rule',{session:false}),async (req,res) => {
	let errors = [],result = {},benefit_result = []
	const {product_code,benefit_category,benefit_code,version} = req.body
	let benefitCodes = []
	if(Array.isArray(benefit_code)) 
		benefitCodes = benefit_code
	else
		benefit_code !== undefined?benefitCodes.push(req.body.benefit_code):benefitCodes
	console.log(benefitCodes)
	await Product.findOne({$and:[{'productCode':product_code},{'version':version}]})
	.then((product) => {
		let benefits = product.benefitDetails[benefit_category]
		if(benefitCodes.length){
			console.log("inside if")
			for(let benefit of benefits){
				for(let code of benefitCodes){
					if(benefit.benefitCodes.includes(code)){
						benefit_result.push(benefit)
					}
				}
			}
		}	
		else{
			benefit_result = benefits
		}
		console.log(benefit_result)
		result["benefit"] = benefit_result
	})
	.catch((err) => errors.push(`Error:${err},Could not find product with product_code:${productid}`))
	if (errors.length) {
		res.status = 500
		result["errors"] = errors
	}
	res.json(result)
});
app.post('/updateBenefit',passport.authenticate('admin-rule',{session:false}),async (req,res)=>{
	let errors = [],result ={}
	const {product_code,benefit_category,version,benefit_code,userName,...input} = req.body
	console.log(input)
	await Product.findOne({$and:[{'productCode':product_code},{'version':version}]})
	.then(async (product) => {
		if(product !== null){
			let versionedProduct = await versionProduct(product,userName)
			let benefits = versionedProduct.benefitDetails[benefit_category]
			let updatedBenefit = {}
			for(let benefit of benefits){
				if(benefit.benefitCodes.includes(benefit_code)){
					benefit.limits = input.limits || benefit.limits
					benefit.waitingPeriods = input.waitingPeriods || benefit.waitingPeriods
					benefit.coveredIf = input.coveredIf || benefit.coveredIf
					benefit.excludedUnless = input.excludedUnless || benefit.excludedUnless
					benefit.inputVariables = input.inputVariables || benefit.inputVariables
					benefit.benefitType = input.benefitType || benefit.benefitType
					benefit.benefitCodes = input.benefitCodes || benefit.benefitCodes
					benefit.benefitName = input.benefitName || benefit.benefitName
					benefit.covered = input.covered !== undefined?input.covered:benefit.covered
					updatedBenefit = benefit
					console.log(updatedBenefit)
				}
			}
			versionedProduct.benefitDetails[benefit_category] = benefits
			versionedProduct.lastUpdatedDate = new Date().toLocaleString('en-UK')
			await versionedProduct.save().then(async () => {
				result["benefit"]=updatedBenefit
				let keys = Object.keys(input)
				for(let key of keys){
					console.log(key,input[key])
					if(key!=="product_code" && key!=="version" && key!=="userName" && key!=="approverName"){
						const prdAudit = new ProductAudit({
							event:"updateBenefit",
							eventHistory:`Product ${product.productCode}'s Benefit ${benefit_category}:${benefit_code} updated with ${key}:${input[key]} by ${userName}`
						})
						let prdAuditId = await Sequence.findByIdAndUpdate({_id:'auditId'},{$inc:{'seq':1}})
							.then((seq)=>
							{
								console.log(seq)
								return seq
							})
							.catch((err) => errors.push(`Error in getting product audit sequence number:${err}`))
						prdAudit._id = prdAuditId.seq
						console.log(prdAudit)
						await prdAudit.save()
							.then(()=>console.log('audit successful'))
							.catch((err)=>errors.push(`Error:${err},audit save failed`))
					}
				}
			})
			.catch((err) => errors.push(`Error in updating benefit:${err}`))
		}
		else{
			throw "Invalid product Code or Input Version"
		}
	})
	.catch((err) => errors.push(`Error:${err},Could not find product with product_code:${product_code}`))
	if (errors.length) {
		res.status = 500
		result["errors"] = errors
	}
	res.json(result)
});
app.post('/deleteBenefit',passport.authenticate('admin-rule',{session:false}),async (req,res) => {
	let errors = [],result = {}
	const {product_code,benefit_category,benefit_code,userName,version} = req.body
	await Product.findOne({$and:[{'productCode':product_code},{'version':version}]})
		.then(async (product) => {
			if(product !== null)
			{
				let versionedProduct = await versionProduct(product,userName)
				let benefits = versionedProduct.benefitDetails[benefit_category]
				let deletedBenefit = benefits.filter((benefit) => {
					if(benefit.benefitCodes.includes(benefit_code))
						return benefit
				})
				let benefitResult = benefits.filter((benefit) => {
					if(!benefit.benefitCodes.includes(benefit_code))
						return benefit
				})
				versionedProduct.benefitDetails[benefit_category] = benefitResult
				versionedProduct.lastUpdatedDate = new Date().toLocaleString('en-UK')
				await versionedProduct.save().then(async () => {
					result["benefit"]= deletedBenefit
					const prdAudit = new ProductAudit({
						event:"DeleteBenefit",
						eventHistory:`Product ${product.productCode}'s Benefit ${benefit_category}:${benefit_code} deleted by ${userName}`
					})
					let prdAuditId = await Sequence.findByIdAndUpdate({_id:'auditId'},{$inc:{'seq':1}})
						.then((seq)=>
						{
							console.log(seq)
							return seq
						})
						.catch((err) => errors.push(`Error in getting product audit sequence number:${err}`))
					prdAudit._id = prdAuditId.seq
					console.log(prdAudit)
					await prdAudit.save()
						.then(()=>console.log('audit successful'))
						.catch((err)=>errors.push(`Error:${err},audit save failed`))
				})
				.catch((err) => errors.push(`Error in deleting benefit:${err}`))
			}
			else{
				throw "Invalid product Code or Input Version"
			}
		})
		.catch((err) => errors.push(`Error:${err},Could not find product with product_code:${productid}`))
	if (errors.length) {
		res.status = 500
		result["errors"] = errors
	}
	res.json(result)
});
app.post('/getProduct',passport.authenticate('admin-rule',{session:false}),async (req,res) => {
	let errors = [],result = {}
	const {showBenefit,product_code,version} = req.body
	let resultProduct = {}
	await Product.findOne({$and:[{'productCode':product_code},{'version':version}]})
	.then((product) => {
		if(product !== null)
		{
			if(showBenefit){
				console.log({...product})
				resultProduct = product
			}
			else{
				console.log("inside else")
				product.benefitDetails = {}
				resultProduct = product
			}
			result["product"] = resultProduct
		}
		else {
			throw "Invalid product Code or Input Version"
		}
	})
	.catch((err) => errors.push(`Error:${err},Could not find product with product_code:${product_code}`))
	if (errors.length) {
		res.status = 500
		result["errors"] = errors
	}
	res.json(result)
});
const versionProduct = async (product,userName) => {
	let errors = [],result = {},existingVersion = null,versioned = false
	if(product.lockStatus == "open"){
		let prdId = await Sequence.findByIdAndUpdate({_id:'productId'},{$inc:{'seq':1}})
			.then((seq)=>{
				return seq
			})
			.catch((err) => errors.push(`Error in getting product sequence number:${err}`))
		const versionedProduct = new Product(product)
		existingVersion = product.version
		let newVersion = existingVersion.replace(/(\d+)+/g,(number) => {return parseInt(number)+1})
		versionedProduct.version = newVersion
		versionedProduct._id = prdId.seq
		versionedProduct.versionedBy = userName
		versionedProduct.versionedDate = new Date().toLocaleString('en-UK')
		versionedProduct.lastUpdatedDate = new Date().toLocaleString('en-UK')
		versionedProduct.isNew = true
		await versionedProduct.save().then(() => result=versionedProduct)
			.catch((err)=>errors.push(`Error:${err},could not create product`))
		versioned = true
	}
	else{
		errors.push(`Error: Cannot version a previously versioned product`)
	}
	if(versioned){
		let index = existingVersion.indexOf("-")
		product.version = existingVersion.slice(0,index)
		product.lockStatus = "Locked"
		await product.save().catch((err)=>errors.push(`Error:${err},Could not version the product`))
		const prdAudit = new ProductAudit({
			event:"versionProduct",
			eventHistory:`Product ${product.productCode} was version by ${userName} on ${new Date().toLocaleString('en-UK')}`
		})
		let prdAuditId = await Sequence.findByIdAndUpdate({_id:'auditId'},{$inc:{'seq':1}})
		.then((seq)=>
		{
			console.log(seq)
			return seq
		})
		.catch((err) => errors.push(`Error in getting product audit sequence number:${err}`))
		prdAudit._id = prdAuditId.seq
		await prdAudit.save()
		.then(()=>console.log('audit successful'))
		.catch((err)=>errors.push(`Error:${err},audit save failed`))
	}
	if (errors.length) {
		result["errors"] = errors
	}
	return result
}
app.post('/updateProduct',passport.authenticate('admin-rule',{session:false}), async (req,res) => {
	let errors = [],result = {},product = {}
	const input = req.body
	console.log(input)
	await Product.findOne({$and:[{'productCode':input.product_code},{'version':input.version}]})
		.then((productRes) => {
			if(productRes !== null)
			{
				product = productRes
			}
			else {
				throw "Invalid product Code or Input Version"
			}
		})
		.catch((err) => errors.push(`Error:${err},Could not find product with product_code:${input.product_code}`))
	if(product.lockStatus == "open"){
		let versionedProduct = await versionProduct(product,input.userName)
		console.log(versionedProduct)
		versionedProduct.productCode = input.newProductCode || versionedProduct.productCode
		versionedProduct.name = input.name || versionedProduct.name
		versionedProduct.defaultWaitingPeriod = input.defaultWaitingPeriod || versionedProduct.defaultWaitingPeriod
		versionedProduct.defaultWaitingPeriodForPEDs = input.defaultWaitingPeriodForPEDs || versionedProduct.defaultWaitingPeriodForPEDs
		versionedProduct.active = input.active || versionedProduct.active
		versionedProduct.archive = input.archive || versionedProduct.archive
		versionedProduct.status = input.active === "Y"?"active":input.active === "N"?"inactive":input.archive === "Y"?"archived":versionedProduct.status
		versionedProduct.deActivatedBy = input.active === "N"?input.userName:versionedProduct.deActivatedBy
		versionedProduct.deActivatedDate = input.active === "N"?new Date().toLocaleString('en-UK'):versionedProduct.deActivatedDate
		versionedProduct.archivedBy = input.archive === "Y"?input.userName:versionedProduct.archivedBy
		versionedProduct.archivedDate = input.archive === "Y"?new Date().toLocaleString('en-UK'):versionedProduct.archivedDate
		versionedProduct.approved = input.approved || versionedProduct.approved
		versionedProduct.approvedBy = input.approved === "Y"?input.approverName:versionedProduct.approvedBy
		versionedProduct.approvedDate = input.approved === "Y"?new Date().toLocaleString('en-UK'):versionedProduct.approvedDate
		versionedProduct.issuer = input.issuer || versionedProduct.issuer
		versionedProduct.UIN = input.UIN || versionedProduct.UIN
		versionedProduct.type = input.type || versionedProduct.type
		versionedProduct.category = input.category || versionedProduct.category
		versionedProduct.url = input.url || versionedProduct.url
		versionedProduct.defaultCopay = input.defaultCopay || versionedProduct.defaultCopay
		versionedProduct.allowedSumInsured = input.allowedSumInsured || versionedProduct.allowedSumInsured
		versionedProduct.lastUpdatedDate = new Date().toLocaleString('en-UK')
		versionedProduct.lastUpdatedBy = input.userName
		await versionedProduct.save().then(()=>result["product"] = versionedProduct).catch((err)=>errors.push(`Error in saving versioned product:${err}`))
		let keys = Object.keys(input)
		for(let key of keys){
			console.log(key,input[key])
			if(key!=="product_code" && key!=="version" && key!=="userName" && key!=="approverName"){
				const prdAudit = new ProductAudit({
					event:"updateProduct",
					eventHistory:`Product ${product.productCode} updated with ${key}:${input[key]} by ${input.userName}`
				})
				let prdAuditId = await Sequence.findByIdAndUpdate({_id:'auditId'},{$inc:{'seq':1}})
					.then((seq)=>
					{
						console.log(seq)
						return seq
					})
					.catch((err) => errors.push(`Error in getting product audit sequence number:${err}`))
				prdAudit._id = prdAuditId.seq
				console.log(prdAudit)
				await prdAudit.save()
					.then(()=>console.log('audit successful'))
					.catch((err)=>errors.push(`Error:${err},audit save failed`))
			}
		}
	}
	else
		errors.push('Could not update versioned product')
	if (errors.length) {
		res.status = 500
		result["errors"] = errors
	}
	res.json(result)
});
app.post('/createProduct',passport.authenticate('admin-rule',{session:false}),async (req,res) => {
	let errors = [],result = {}
	const input = req.body
	const newProduct = new Product(input)
	newProduct.productCode = input.product_code
	newProduct.createdBy = input.userName
	newProduct.createdDate = new Date().toLocaleString('en-UK')
	newProduct.lastUpdatedDate = new Date().toLocaleString('en-UK')
	newProduct.lastUpdatedBy = input.userName
	newProduct.approvedBy = input.approverName
	newProduct.approvedDate = new Date().toLocaleString('en-UK')
	let prdId = await Sequence.findByIdAndUpdate({_id:'productId'},{$inc:{'seq':1}})
	.then((seq)=>{
		console.log(seq)
		return seq
	})
	.catch((err) => errors.push(`Error in getting product sequence number:${err}`))
	console.log(prdId)
	newProduct._id = prdId.seq
	console.log(newProduct)
	await newProduct.save()
	.then(()=>{
		result["product"]=newProduct
	})
	.catch((err) => errors.push(`Error:${err},Could not create product`))
	const prdAudit = new ProductAudit({
		event:"createProduct",
		eventHistory:`New product ${newProduct.productCode} approved by ${newProduct.approvedBy} was created by ${newProduct.createdBy} on ${newProduct.createdDate}`
	})
	let prdAuditId = await Sequence.findByIdAndUpdate({_id:'auditId'},{$inc:{'seq':1}})
		.then((seq)=>
		{
			console.log(seq)
			return seq
		})
		.catch((err) => errors.push(`Error in getting product audit sequence number:${err}`))
	console.log(prdAuditId)
	prdAudit._id = prdAuditId.seq
	console.log(prdAudit)
	await prdAudit.save()
	.then(()=>console.log('audit successful'))
	.catch((err)=>errors.push(`Error:${err},audit save failed`))
	if (errors.length) {
		res.status = 500
		result["errors"] = errors
	}
	res.json(result)
});
app.post('/renewProduct',passport.authenticate('admin-rule',{session:false}),async (req,res) => {
	let errors = [],result = {}
	const input = req.body
	let product = await Product.findOne({$and:[{'productCode':input.product_code},{'version':input.version}]})
	.then((productRes) => {
		if(productRes !== null)
		{
			return productRes
		}
		else {
			throw "Invalid product Code or Input Version"
		}	
	})
	.catch((err) => errors.push(`Error:${err},Could not find product`))
	console.log(product)
	if(product.active !== "Y" && product.lockStatus === "open"){
		if(input.active ==="Y"){
			let renewalHistory = {
				"renewedBy":input.userName,
				"renewedDate":input.userName,
				"lastEffectiveDate":product.effectiveDate,
				"lastExpirationDate":product.expirationDate
			}
			product.renewalHistory.push(renewalHistory)
		}
		product.active = input.active || product.active
		product.status = input.active === "Y"?"active":"inactive"
		product.effectiveDate = input.effectiveDate || new Date().toLocaleString('en-UK')
		product.expirationDate = input.expirationDate || product.expirationDate
		product.renewedBy = input.active === "Y"?input.userName:product.renewedBy
		product.renewedDate = input.active === "Y"?new Date().toLocaleString('en-UK'):product.renewedDate
		product.lastUpdatedDate = new Date().toLocaleString('en-UK')
		product.lastUpdatedBy = input.userName || product.lastUpdatedBy
		await product.save()
			.then(result["product"] = product)
			.catch((err) => errors.push(`Error:${err},Could not update product`))
		const prdAudit = new ProductAudit({
			event:"renewProduct",
			eventHistory:`Product ${product.productCode} renewed with effectiveDate:${product.effectiveDate} by  ${input.userName}`
		})
		let prdAuditId = await Sequence.findByIdAndUpdate({_id:'auditId'},{$inc:{'seq':1}})
			.then((seq)=>
			{
				console.log(seq)
				return seq
			})
			.catch((err) => errors.push(`Error in getting product audit sequence number:${err}`))
		prdAudit._id = prdAuditId.seq
		console.log(prdAudit)
		await prdAudit.save()
			.then(()=>console.log('audit successful'))
			.catch((err)=>errors.push(`Error:${err},audit save failed`))
	}
	else{
		errors.push(`Error in renewing product ${product.productCode} with version ${product.version}`)
	}
	if (errors.length) {
		res.status = 500
		result["errors"] = errors
	}
	res.json(result)
});
app.post('/signup',passport.authenticate('reg-rule',{session:false}), async (req,res) =>{
	let result = {},errors = []
	const input = req.body
	if(!input.email || !input.password){
		errors.push(`Please add username and password`)
	}
	else{
		let userId = await Sequence.findByIdAndUpdate({_id:'userId'},{$inc:{'seq':1}}).then((seq)=>{return seq}).catch((err) => errors.push(`Error in getting user sequence number:${err}`))
		
		const newUser = new User({email:input.email,password:input.password,name:input.userName,organization:input.organization,active:"Y"})
		newUser._id = userId.seq
		if (newUser.isModified('password') || newUser.isNew) {
			bcrypt.genSalt(10, (err, salt) => {
				if (err) {
					return next(err);
				}
				bcrypt.hash(newUser.password, salt, null, (err, hash) => {
					if (err) {
						return next(err);
					}
					newUser.password = hash;
				});
			});
		} 
		console.log(newUser)
		await newUser.save().then(()=>{
			result = {"success":true,"message":"User registration successfull"}
		}).catch((err)=> errors.push(`Error:${err},Username already exists`))
	}
	if(errors.length){
		res.status = 500
		result["errors"] = errors
	}
	res.json(result)
});
app.post('/signin',passport.authenticate('user-rule',{session:false}), async(req,res) => {
	let result = {},errors=[]
	const input = req.body
	await User.findOne({$and:[{email:input.userName},{active:"Y"}]}).then(async (user)=>{
		if(!user){
			errors.push(`User not found`)
		}
		else{
			console.log(input)
			bcrypt.compare(input.password, user.password,(err,data) => {
				if(err){
					errors.push(`Error:${err},Password didnt match`)
				}
				if(data){
					let token = jwt.sign(user.toJSON(),secret,{expiresIn:'24h'})
					console.log(token)
					res.json({"token":token,"validTime":'1day'})
				}
				else{
					errors.push('Invalid password')
				}
			})
		}
	}).catch((err)=> errors.push(`Error:${err},User not found`))
	if(errors.length){
		res.status = 500
		result["errors"] = errors
		res.json(result)
	}
});
app.post('/activateUser',passport.authenticate('reg-rule',{session:false}), async (req,res) => {
	let errors = [],result = {}
	const input = req.body
	let user = await User.findOne({email:input.userName}).then((user)=>{
		return user
	})
	.catch((err)=>errors.push(`Error:${err},Could not find user`))
	console.log(user)
	console.log(input)
	user.active = input.active || user.active
	user.save().then(()=>{
		result["success"]=true
		result["message"]=input.active ==="Y"?"User activation successful":"User deactivation successful"
		res.json(result)
	}).catch((err)=>errors.push(`Error:${err},Error in user activation`))
	if(errors.length){
		res.status = 500
		result["errors"] = errors
		res.json(result)
	}
})
app.post('/findCoverage',passport.authenticate('user-rule',{session:false}), async (req, res) => {
	let errors = []
    const input = req.body

	input.policy_variant_type ||= 'DEFAULT'

	//let product = products[input.product_code || 'NIVABUPA_REASSURE']
	let product = {}
	await Product.findOne({'productCode':input.product_code}).then((dbProduct) => {product = dbProduct})
	let benefitCategory = input.benefit_category || 'INPATIENT'
	let benefit_codes = []
	let result = {}
	let coverages = []

	if(input.benefit_code)
		benefit_codes.push(input.benefit_code)
	else
		benefit_codes = input.benefit_codes

	let total_benefits = benefit_codes.length
	let total_benefits_covered = 0,total_benefits_excluded = 0
	if (product) {
		if (total_benefits) {
			let defaultWaitingPeriod = "30 days"

			for (let defaultwaitingPeriodObj of product.defaultWaitingPeriod) {
				if(defaultwaitingPeriodObj.waitingPeriodCondition && fhirpath.evaluate(input, defaultwaitingPeriodObj.waitingPeriodCondition)[0]) {
					defaultWaitingPeriod = defaultwaitingPeriodObj.waitingPeriod
					break
				}
			}

			let defaultWaitingPeriodForPEDs = "36 months"

			for (let defaultwaitingPeriodPEDObj of product.defaultWaitingPeriodForPEDs) {
				if(defaultwaitingPeriodPEDObj.waitingPeriodCondition && fhirpath.evaluate(input, defaultwaitingPeriodPEDObj.waitingPeriodCondition)[0]) {
					defaultWaitingPeriodForPEDs = defaultwaitingPeriodPEDObj.waitingPeriod
					break
				}
			}
			for(let benefit_code of benefit_codes){

				let benefit = {}
				let benefit_result = {}

				for (let benefitObj of product.benefitDetails[benefitCategory]) {
					if (benefitObj.benefitCodes.includes(benefit_code)) {
						benefit = benefitObj
						break
					}
				}
			
				if (Object.keys(benefit).length) {
					benefit_result["benefit_covered"] = benefit.covered
					benefit_result["benefit_name"] = benefit.benefitName
					benefit_result["benefit_codes"] = benefit.benefitCodes
								
					if(benefit.covered && benefit.coveredIf.length) {
						for (const rule of benefit.coveredIf) {
							if (!(fhirpath.evaluate(input,rule.ruleCondition)[0])) {
								benefit_result["benefit_covered"] = false
								benefit_result["benefit_coverage_failed_rules"] ||= []
								benefit_result["benefit_coverage_failed_rules"].push({
									"code": rule.ruleCode,
									"displayText": rule.ruleDisplayText
								})
							}
						}
					}

					if(!benefit.covered && benefit.excludedUnless.length) {
						let exclusionFlag = false
						let exclusionExceptions = []
						for (const rule of benefit.excludedUnless) {
							if (fhirpath.evaluate(input,rule.ruleCondition)[0]) {
								exclusionExceptions.push({
									"code": rule.ruleCode,
									"displayText": rule.ruleDisplayText
								})
							}
							else {
								exclusionFlag = true
								break
							}
						}
						benefit_result["benefit_covered"] = !exclusionFlag
						if (benefit_result["benefit_covered"] && exclusionExceptions.length)
							benefit_result["benefit_exclusion_exceptions"] = exclusionExceptions
					}

					if (benefit_result["benefit_covered"]) {
						for (let limit of benefit.limits) {
							if (limit.limitCondition && fhirpath.evaluate(input, limit.limitCondition)[0]) {
								let limitResult = fhirpath.evaluate(input, limit.limitAmountExpression)
								if (limitResult.length)
									benefit_result["limit_per_" + limit.limitType.toLowerCase()] = +limitResult[0]
							}
						}
			
						for (let waitingPeriodObj of benefit.waitingPeriods) {
							if(waitingPeriodObj.waitingPeriodCondition && fhirpath.evaluate(input, waitingPeriodObj.waitingPeriodCondition)[0]) {
								benefit_result["benefit_waiting_period"] = waitingPeriodObj.waitingPeriod
							}
						}
					}
				}
				else {
					benefit_result["benefit_covered"] = true
				}

				if (!benefit_result["benefit_waiting_period"])
					benefit_result["benefit_waiting_period"] = defaultWaitingPeriod
				
				benefit_result["benefit_default_waiting_period_for_PEDs"] = defaultWaitingPeriodForPEDs
				
				if(benefit_result["benefit_covered"])
					total_benefits_covered++
				else
					total_benefits_excluded++
				
				if(total_benefits > 1){
					coverages.push(benefit_result)
					result["coverage_results"] = coverages
					result["total_benefits_covered"] = total_benefits_covered
					result["total_benefits_excluded"] = total_benefits_excluded
					result["total_benefits"] = total_benefits
				}
				else
					result = benefit_result
			}
		}
		else {
			errors.push(`benefit_code is missing in the input`)
		}

	}
	else {
		errors.push(`Could not find product for the product_code: ${input.product_code}`)
	}

	if (errors.length) {
		res.status = 500
		result["errors"] = errors
	}

    res.json(result)
});

app.post('/getInputVariables',passport.authenticate('user-rule',{session:false}),async (req,res) => {
    const input = req.body
    let product = {},inputVariableDetails = []
	await InputVariable.find({}).then((dbInput) => {inputVariableDetails = dbInput})
	console.log(inputVariableDetails)
	await Product.findOne({'productCode':input.product_code}).then((dbProduct) => {product = dbProduct})
    let benefitCategory = input.benefit_category || 'INPATIENT'
    let inputBenefitCode = []
    let result = []
    let errors = []
    if(Array.isArray(input.benefit_codes))
		inputBenefitCode = input.benefit_codes
	else
		input.benefit_codes !== undefined?inputBenefitCode.push(input.benefit_codes):inputBenefitCode

    let benefits = product.benefitDetails[benefitCategory]
    if(product){
        if(inputBenefitCode.length){
			for(let benefitCode of inputBenefitCode){
				let benefitInputVars = [],inputVars_result = []
				let benefit_result = {}
				let benefit = {}
				for(let benefitObj of benefits){
					if(benefitObj.benefitCodes.includes(benefitCode)){
						benefit = benefitObj
						break
					}
				}
				benefit_result["benefit_code"] = benefit.benefitCodes.join()
				benefitInputVars = benefit.inputVariables
				if(benefitInputVars.length){
					for(let inputVar of benefitInputVars){
						for(let inputdetail of inputVariableDetails){
							if(inputdetail.name === inputVar){
								let newInput = {
									"name":inputdetail.name,
									"type":inputdetail.type,
									"description":inputdetail.description,
									"allowed_values":inputdetail.allowed_values.length === 0?undefined:inputdetail.allowed_values
								}
								inputVars_result.push(newInput)
							}
						}
					}
				}
				benefit_result["input_variables"] = inputVars_result
				result.push(benefit_result)
			}
        }
        else{ 
            for(let benefitObj of benefits){
				let benefit_result = {}
				let inputVars_result = []
				let benefitInputVars = benefitObj.inputVariables
				benefit_result["benefit_code"] = benefitObj.benefitCodes.join()
				if(benefitInputVars.length){
					for(let inputVar of benefitInputVars){
						for(let inputdetail of inputVariableDetails){
							if(inputdetail.name === inputVar){
								let newInput = {
									"name":inputdetail.name,
									"type":inputdetail.type,
									"description":inputdetail.description,
									"allowed_values":inputdetail.allowed_values.length === 0?undefined:inputdetail.allowed_values
								}
								inputVars_result.push(newInput)
							}
						}
					}
					benefit_result["input_variables"] = inputVars_result
					result.push(benefit_result)
				}				
			}
        }
    }
    else{
        errors.push(`Product not found for product_code: ${input.product_code}`)
    }
    if (errors.length) {
		res.status = 500
		result["errors"] = errors
	}
    res.json(result)
});
// Server Setup
app.listen(PORT,console.log(`Server started on port ${PORT}`))
