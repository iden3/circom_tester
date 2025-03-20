const chai = require("chai");
const path = require("path");
const wasm_tester = require("./../../index").wasm;
const c_tester = require("./../../index").c;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

const assert = chai.assert;

describe("Multiplier2", function () {
    this.timeout(100000);

    it("Checking the compilation of a simple circuit generating wasm", async function () {

        const circuit = await wasm_tester(
            path.join(__dirname, "Multiplier2.circom")
        );
        const w = await circuit.calculateWitness({
            a: "18557398763080563439574185585645102004924653463016315326623530540120602021652",
            b: "6905411550336032894518809912132382781376814349417260111983470984156998288047"
        });
        await circuit.checkConstraints(w);
        const outputs = await circuit.getOutput(w, {"a": 1, "b": 1, "c": 1});
        console.log(outputs);
        assert.equal(outputs.c, "17557711783593955402415343928078493368246126305786338715665102716827650933")
    });

    it("Checking the compilation of a simple circuit generating wasm in a given folder", async function () {
        const circuit = await wasm_tester(
            path.join(__dirname, "Multiplier2.circom"),
            {
                output: path.join(__dirname),
            }
        );
        const w = await circuit.calculateWitness({a: 2, b: 4});
        await circuit.checkConstraints(w);
    });

    it("Checking the compilation of a simple circuit generating wasm in a given folder without recompiling", async function () {
        const circuit = await wasm_tester(
            path.join(__dirname, "Multiplier2.circom"),
            {
                output: path.join(__dirname),
                recompile: false,
            }
        );
        const w = await circuit.calculateWitness({a: 6, b: 3});
        await circuit.checkConstraints(w);

    });

    it("Checking the compilation of a simple circuit generating C", async function () {
        const circuit = await c_tester(
            path.join(__dirname, "Multiplier2.circom")
        );
        try {
            const w = await circuit.calculateWitness({a: 2, b: 4});
            await circuit.checkConstraints(w);
        } catch (e) {
            if (e.message.includes("Illegal instruction")) {
                // GitHub Actions may run on older hardware that doesn't support ADX
                // instructions used in cpp witness calculator
                // If such a case, skip this test
                this.skip();
            } else {
                throw e;
            }
        }
    });

    it("Checking the compilation of a simple circuit generating C in a given folder", async function () {
        const circuit = await c_tester(
            path.join(__dirname, "Multiplier2.circom"),
            {
                output: path.join(__dirname),
            }
        );
        try {
            const w = await circuit.calculateWitness({a: 2, b: 4});
            await circuit.checkConstraints(w);
        } catch (e) {
            if (e.message.includes("Illegal instruction")) {
                this.skip();
            } else {
                throw e;
            }
        }
    });

    it("Checking the compilation of a simple circuit generating C in a given folder without recompiling", async function () {
        const circuit = await c_tester(
            path.join(__dirname, "Multiplier2.circom"),
            {
                output: path.join(__dirname),
                recompile: false,
            }
        );
        try {
            const w = await circuit.calculateWitness({a: 6, b: 3});
            await circuit.checkConstraints(w);
        } catch (e) {
            if (e.message.includes("Illegal instruction")) {
                this.skip();
            } else {
                throw e;
            }
        }
    });

});
