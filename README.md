# circom tester
## Setup
1. Create new node js project.
2. Install the `circom_tester` packge.

## Example usage

A simple demonstration of reading the circuit and inputs files, then calculating the witness, checking the constraints and asserting the output of the program.

index.js
``` index.js
const circuitFile = "circuit.circom";
const inputsFile = "inputs.json";

async function testCircuit() {
    const fs = require('fs');
    const tester = require('circom_tester').wasm;

    // reading input file
    let rawdata = fs.readFileSync(inputsFile);
    let input = JSON.parse(rawdata);
    console.log(input);

    // load and calc witness
    const circuit = await tester(circuitFile);
    const witness = await circuit.calculateWitness(input.inputs, true);

    // check constrains and assert the ouput result of the cirucit
    await circuit.checkConstraints(witness);
    await circuit.assertOut(witness, input.expOut);
  }
  
  function start() {
    return testCircuit();
  }
  
  // Call start
  (async() => {
    console.log('Testing circuit...');
  
    await start();
    
    console.log('Test pass');
  })();
```