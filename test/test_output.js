const chai = require("chai");
const path = require("path");
const wasm_tester = require("./../index").wasm;
const c_tester = require("./../index").c;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

const assert = chai.assert;

describe("outputs tester", function () {
    this.timeout(100000);

    it("Checking the compilation of a simple circuit generating C in a given folder without recompiling", async function () {
        const circuit = await wasm_tester(
            path.join(__dirname, "m2.circom"),
        );
        const w = await circuit.calculateWitness({a: 6, b: 3});
        const o = await circuit.getOutput(w, ["c", "vec[10]"]);
        console.log(o);
        console.log("ok");
    });

});
