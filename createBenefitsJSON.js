const fs = require('fs');

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

const inputJSON = require(`./input/${argv.inputPMLConfigJSONFile}`)

const outputJSONFile = `./pmlconf/${argv.outputPMLConfigJSONFile}`

let productJSON = { 
    id: argv.productShortName || "NIVABUPA_REASSURE",
    status: "active",
    name: argv.productName || "Niva Bupa Reasssure Insurance Plan",
    defaultWaitingPeriod: [],
    defaultWaitingPeriodForPEDs: [],
    benefitDetails: {
        INPATIENT: [],
        ACCIDENT: [],
        ALTERNATIVE: [],
        DAYCARE: [],
        DOMICILARY: [],
        HEALTHCHECK: [],
        HOMECARE: []
    }
};

argv.defaultWaitingPeriod ||= "30 days|true"
argv.defaultWaitingPeriodForPEDs ||= "36 months|true"

if(argv.defaultWaitingPeriod) {
    for (const dwpStr of argv.defaultWaitingPeriod.toString().split(',')) {
        let dwp = {}
        let dwpElements = dwpStr.split('|')

        dwp["waitingPeriod"] = dwpElements[0]
        dwp["waitingPeriodCondition"] = dwpElements[1]

        productJSON.defaultWaitingPeriod.push(dwp)
    }
}

if(argv.defaultWaitingPeriodForPEDs) {
    for (const dwpedStr of argv.defaultWaitingPeriodForPEDs.toString().split(',')) {
        let dwped = {}
        let dwpedElements = dwpedStr.split('|')

        dwped["waitingPeriod"] = dwpedElements[0]
        dwped["waitingPeriodCondition"] = dwpedElements[1]

        productJSON.defaultWaitingPeriodForPEDs.push(dwped)
    }
}

for (const benefitConfig of inputJSON) {
    if (!productJSON.benefitDetails[benefitConfig["Category"]]) {
        console.error(`Invalid benefit category: ${benefitConfig["Category"]} for the benefit: ${benefitConfig["Benefit_Name"]}`)
        continue
    }

    let benefit = {
        limits: [],
        waitingPeriods: [],
        coveredIf: [],
        excludedUnless: [],
        inputVariables: []
    }
    console.log(benefitConfig.Benefit_Name)

    benefit["benefitType"] = benefitConfig["Benefit_Type"]
    benefit["benefitCodes"] = benefitConfig["Benefit_Codes"].toString().split(',')
    benefit["benefitName"] = benefitConfig["Benefit_Name"]
    benefit["covered"] = benefitConfig["CoveredYN"] == 'Y' ? true : false
    if(benefitConfig["Input_Variables"]){
        benefit["inputVariables"] = benefitConfig["Input_Variables"].toString().split(',')
    }
    if(benefitConfig["Limits"]) {
        for (const limitStr of benefitConfig["Limits"].toString().split(',')) {
            let limit = {}
            let limitElements = limitStr.split('|')

            limit["limitAmountExpression"] = limitElements[0]
            limit["limitType"] = limitElements[1]
            limit["limitCondition"] = limitElements[2]

            benefit.limits.push(limit)
        }
    }

    if(benefitConfig["Waiting_Period"]) {
        for (const wpStr of benefitConfig["Waiting_Period"].toString().split(',')) {
            let wp = {}
            let wpElements = wpStr.split('|')

            wp["waitingPeriod"] = wpElements[0]
            wp["waitingPeriodCondition"] = wpElements[1]

            benefit.waitingPeriods.push(wp)
        }
    }

    if(benefitConfig["Covered_If"]) {
        for (const ciStr of benefitConfig["Covered_If"].toString().split(',')) {
            let ciRule = {}
            let ciElements = ciStr.split('|')

            ciRule["ruleCode"] = ciElements[0]
            ciRule["ruleDisplayText"] = ciElements[1]
            ciRule["ruleCondition"] = ciElements[2]

            benefit.coveredIf.push(ciRule)
        }
    }

    if(benefitConfig["Excluded_Unless"]) {
        for (const euStr of benefitConfig["Excluded_Unless"].toString().split(',')) {
            let euRule = {}
            let euElements = euStr.split('|')

            euRule["ruleCode"] = euElements[0]
            euRule["ruleDisplayText"] = euElements[1]
            euRule["ruleCondition"] = euElements[2]

            benefit.excludedUnless.push(euRule)
        }
    }

    productJSON.benefitDetails[benefitConfig["Category"]].push(benefit)
}

let data = JSON.stringify(productJSON, null, 4);
fs.writeFileSync(outputJSONFile, data);