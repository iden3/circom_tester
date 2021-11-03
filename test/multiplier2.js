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

    it("Checking the compilation of a simple circuit generating wasm", async () => {

        const input = path.join(__dirname, "Multiplier2.circom");
        const opts = await getOptions(__dirname);
        const circuit = await wasm_tester(input, opts);
        const w = await circuit.calculateWitness({a: 2, b: 4});
        await circuit.checkConstraints(w);
    });

    it("Checking the compilation of a simple circuit generating C", async () => {

        const circuit = await c_tester(path.join(__dirname, "Multiplier2.circom"));
        const w = await circuit.calculateWitness({a: 2, b: 4});
        await circuit.checkConstraints(w);

    });

});
