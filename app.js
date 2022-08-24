// Requiring module
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const reassurePolicy = require("./pmlconf/ReAssure-2022-08-23-9.pml.json")
const healthCompanionPolicy = require("./pmlconf/HealthCompanion-2022-08-23-5.pml.json")
const heartBeatPolicy = require("./pmlconf/HeartBeat-2022-08-23-2.pml.json")

const inputVariableDetails = require("./inputVariableDetails.json")

const fhirpath = require('fhirpath')
// For FHIR model data (choice type support) pull in the model file:
//const fhirpath_r4_model = require('fhirpath/fhir-context/r4')

// Creating express object
const app = express()

const products = {
	"NIVABUPA_REASSURE": reassurePolicy,
	"NIVABUPA_HEALTHCOMPANION": healthCompanionPolicy,
	"NIVABUPA_HEARTBEAT": heartBeatPolicy
}

// Handling GET request
app.get('/', (req, res) => {
	res.send({name: "Vitraya PML Service", version: "v1.0.0"})
	res.end()
})

// Port Number
const PORT = process.env.PORT || 6001

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.post('/findCoverage', (req, res) => {

	let errors = []
    const input = req.body

	input.policy_variant_type ||= 'DEFAULT'

	let product = products[input.product_code || 'NIVABUPA_REASSURE']
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

app.post('/getInputVariables',(req,res) => {
    const input = req.body
    let product = products[input.product_code]
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
								inputVars_result.push(inputdetail)
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
								inputVars_result.push(inputdetail)
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
