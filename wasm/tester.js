const { BaseTester, parseOptionsAndCompile} = require("../common/tester");

const fs = require("fs");
const path = require("path");

module.exports = wasm_tester;

async function wasm_tester(circomInput, _options) {
    let options = Object.assign({}, _options);
    options.wasm = true;
    options = await parseOptionsAndCompile(circomInput, options);

    const baseName = options.baseName;

    const WitnessCalculator = require("./witness_calculator");
    const wasm = await fs.promises.readFile(path.join(options.output, baseName + "_js/" + baseName + ".wasm"));
    const wc = await WitnessCalculator(wasm);

    return new WasmTester(options.output, baseName, wc);
}

class WasmTester extends BaseTester {
    constructor(dir, baseName, witnessCalculator) {
        super(dir, baseName);
        this.witnessCalculator = witnessCalculator;
    }

    async calculateWitness(input, sanityCheck) {
        return await this.witnessCalculator.calculateWitness(input, sanityCheck);
    }
}
