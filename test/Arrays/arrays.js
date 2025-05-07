const chai = require("chai");
const path = require("path");
const wasm_tester = require("./../../index").wasm;
const c_tester = require("./../../index").c;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

const assert = chai.assert;

const testInput = {
    a: [["1", "2"], ["3", "4"]],
    commitment: "3330844108758711782672220159612173083623710937399719017074673646455206473965"
};

describe("Arrays", function () {
    this.timeout(100000);

    it("Checking the compilation of a simple circuit generating wasm", async function () {

        const circuit = await wasm_tester(
            path.join(__dirname, "Arrays.circom")
        );
        const w = await circuit.calculateWitness(testInput);

        const outputs = await circuit.getOutput(w, {"a": [2, 2], "commitment": 1});
        await circuit.checkConstraints(w);
        console.log(outputs);
    });

    it("Checking the compilation of a simple circuit generating wasm in a given folder", async function () {
        const circuit = await wasm_tester(
            path.join(__dirname, "Arrays.circom"),
            {
                output: path.join(__dirname, "tmp"),
            }
        );
        const w = await circuit.calculateWitness(testInput);
        await circuit.checkConstraints(w);
    });

    it("Checking the compilation of a simple circuit generating wasm in a given folder without recompiling", async function () {
        const circuit = await wasm_tester(
            path.join(__dirname, "Arrays.circom"),
            {
                output: path.join(__dirname, "tmp"),
                recompile: false,
            }
        );
        const w = await circuit.calculateWitness(testInput);
        await circuit.checkConstraints(w);

    });

    it("Checking the compilation of a simple circuit generating C", async function () {
        const circuit = await c_tester(
            path.join(__dirname, "Arrays.circom")
        );
        try {
            const w = await circuit.calculateWitness(testInput);
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
            path.join(__dirname, "Arrays.circom"),
            {
                output: path.join(__dirname, "tmp"),
            }
        );
        try {
            const w = await circuit.calculateWitness(testInput);
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
            path.join(__dirname, "Arrays.circom"),
            {
                output: path.join(__dirname, "tmp"),
                recompile: false,
            }
        );
        try {
            const w = await circuit.calculateWitness(testInput);
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
