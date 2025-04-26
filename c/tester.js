const { BaseTester, parseOptionsAndCompile} = require("../common/tester");

const fs = require("fs");
const path = require("path");

const util = require("util");
const exec = util.promisify(require("child_process").exec);

const readWtns = require("snarkjs").wtns.exportJson;

module.exports = c_tester;

BigInt.prototype.toJSON = function () {
    return this.toString()
}

async function c_tester(circomInput, _options) {
    let options = Object.assign({}, _options);
    options.c = true;
    options = await parseOptionsAndCompile(circomInput, options);
    return new CTester(options.output, options.baseName);
}

class CTester extends BaseTester {
    constructor(dir, baseName) {
        super(dir, baseName);
    }

    async calculateWitness(input) {
        const inputjson = JSON.stringify(input);
        const inputFile = path.join(this.dir, this.baseName + "_cpp/" + this.baseName + ".json");
        const wtnsFile = path.join(this.dir, this.baseName + "_cpp/" + this.baseName + ".wtns");
        const runc = path.join(this.dir, this.baseName + "_cpp/" + this.baseName);
        fs.writeFile(inputFile, inputjson, function (err) {
            if (err) throw err;
        });
        await exec("cd " + path.join(this.dir, this.baseName + "_cpp/"));
        let proc = await exec(runc + " " + inputFile + " " + wtnsFile);
        if (proc.stdout !== "") {
            console.log(proc.stdout);
        }
        if (proc.stderr !== "") {
            console.error(proc.stderr);
        }
        return await readBinWitnessFile(wtnsFile);
    }
}

async function readBinWitnessFile(fileName) {
    return readWtns(fileName);
}
