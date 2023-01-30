# circom tester
## Setup
1. Create new node js project.
2. Install `circom_tester` and `chai` packges.
3. Install `mocha` packge to run the tests.


## Creating & Running a test file

Create a js file contain the following code or use the src provided in the following section.
<br>Execue `mocha -p -r ts-node/register 'multiplier2.js'` to run the test file.

multiplier2.js ([src](test/multiplier2.js))
``` multiplier2.js
const chai = require("chai");
const path = require("path");
const wasm_tester = require("./../index").wasm;
const c_tester = require("./../index").c;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

const assert = chai.assert;

describe("Simple test", function () {
    this.timeout(100000);

    it("Checking the compilation of a simple circuit generating wasm", async function () {
        const circuit = await wasm_tester(path.join(__dirname, "Multiplier2circom"));
        const w = await circuit.calculateWitness({a: 2, b: 4});
        await circuit.checkConstraints(w);
    });
});
```
