const fs = require("fs");
const path = require("path");
const { F1Field } = require("ffjavascript");
const { readR1cs } = require("r1csfile");
const util = require("util");
const tmp = require("tmp-promise");
const { createHash } = require('crypto');
const exec = util.promisify(require("child_process").exec);

async function parseOptionsAndCompile(circomInput, options) {
    const compilerVersion = await compiler_above_version("2.0.0");
    if (!compilerVersion) {
        throw new Error("Wrong compiler version. Must be at least 2.0.0");
    }

    let baseName = path.basename(circomInput, ".circom");

    options.sym = true;
    options.baseName = baseName;
    options.json = options.json || false; // constraints in json format
    options.r1cs = true;
    options.compile = (typeof options.recompile === 'undefined') ? true : options.recompile; // by default compile

    // if output is not set, create a temporary directory
    if (typeof options.output === 'undefined') {
        tmp.setGracefulCleanup();
        const dir = await tmp.dir({prefix: "circom_", unsafeCleanup: true});
        options.output = dir.path;
    } else {
        try {
            await fs.promises.access(options.output);
        } catch (err) {
            if (!options.compile) {
                throw new Error("Cannot set recompile to false if the output path does not exist");
            }
            await fs.promises.mkdir(options.output, {recursive: true});
        }
    }

    // read contents of circomInput
    const circomCode = await fs.promises.readFile(circomInput, "utf8");

    // check if circomCode has main component instantiated
    const mainRegex = /^\s*component\s+main(\s|=)/m;
    const mainDefined = mainRegex.test(circomCode);

    // if main is not defined, get all template names
    const templateNames = [];
    const pragmaLines = [];
    if (!mainDefined) {
        // get all pragma lines to put in temporary circom file
        const pragmaRegex = /^\s*pragma\s+.*$/gm;
        let pragmaMatches;
        while ((pragmaMatches = pragmaRegex.exec(circomCode)) !== null) {
            pragmaLines.push(pragmaMatches[0]);
        }

        // get all template names
        const templateRegex = /^\s*template\s+([a-zA-Z0-9_$]+)\s*\(/gm;
        let templateMatches;
        while ((templateMatches = templateRegex.exec(circomCode)) !== null) {
            templateNames.push(templateMatches[1]);
        }
    }

    // check for conflicting options
    if (mainDefined) {
        if (options.templateName || options.templateParams || options.templatePublicSignals) {
            throw new Error("Cannot set template name, params and public signals if main is already defined");
        }
    }

    // when main is not defined, create temporary circom file using specified template as a main component
    if (!mainDefined) {
        // if templateName is not provided, try to autodetect it
        if (!options.templateName) {
            // if file has only one template, use it as main component
            if (templateNames.length === 1) {
                options.templateName = templateNames[0];
            } else {
                throw new Error("No main component defined and template name to generate one is not provided");
            }
        }

        // define main component with templateName
        let params = "";
        if (options.templateParams) {
            params = options.templateParams.map((p) => p.toString()).join(", ");
        }

        // define public signals if any
        let publicSignals = "";
        if (options.templatePublicSignals) {
            publicSignals = "{public [" + options.templatePublicSignals.map((p) => p.toString()).join(", ") + "]}";
        }

        // define main component
        const mainComponent = `component main ${publicSignals} = ${options.templateName}(${params});`;

        // include original circom file
        const includes = "include \"" + baseName + ".circom\";";

        const tmpCircomCodeLines = [...pragmaLines, includes, mainComponent];
        const tmpCircomCode = tmpCircomCodeLines.join("\n");

        // calculate the hash of the main component using sha256
        const h = createHash("sha256");
        const hash = h.update(Buffer.from(tmpCircomCode, "utf8")).digest('hex');
        // and use it as a suffix for the temporary directory name inside the output path
        let suffix = hash.substring(0, 8);
        const tmpCircomPath = path.join(options.output, baseName + "_" + options.templateName + "_" + suffix);

        // create the directory if it doesn't exist
        await fs.promises.mkdir(tmpCircomPath, {recursive: true});

        // add the original circom file directory to the include path
        const includePath = path.dirname(path.resolve(circomInput));
        if (options.include) {
            if (Array.isArray(options.include)) {
                options.include.push(includePath);
            } else {
                options.include = [options.include, includePath];
            }
        } else {
            options.include = [includePath];
        }

        // override baseName, output path and circomInput
        baseName = "circuit";
        options.baseName = baseName;
        options.output = tmpCircomPath;
        circomInput = path.join(tmpCircomPath, baseName + ".circom");

        // write the generated circom code to the temporary file circuit.circom
        await fs.promises.writeFile(circomInput, tmpCircomCode, "utf8");

    }

    // compile flag is set by default, unless overwritten by recompile=false option
    if (options.compile) {
        await compile(baseName, circomInput, options);
    } else {
        const jsPath = path.join(options.output, baseName + "_js");
        try {
            await fs.promises.access(jsPath);
        } catch (err) {
            throw new Error("Cannot set recompile to false if the " + jsPath + " folder does not exist")
        }
    }

    return options;
}

async function compile(baseName, fileName, options) {
    let flags = "";
    if (options.include) {
        if (Array.isArray(options.include)) {
            for (let i = 0; i < options.include.length; i++) {
                flags += "-l " + options.include[i] + " ";
            }
        } else {
            flags += "-l " + options.include + " ";
        }
    }
    if (options.c) flags += "--c ";
    if (options.wasm) flags += "--wasm ";
    if (options.sym) flags += "--sym ";
    if (options.r1cs) flags += "--r1cs ";
    if (options.json) flags += "--json ";
    if (options.output) flags += "--output " + options.output + " ";
    if (options.prime) flags += "--prime " + options.prime + " ";
    if (options.O === 0) flags += "--O0 ";
    if (options.O === 1) flags += "--O1 ";
    if (options.O === 2) flags += "--O2 ";
    if (options.O2round) flags += "--O2round " + options.O2round + " ";
    if (options.verbose) flags += "--verbose ";
    if (options.inspect) flags += "--inspect ";
    if (options.simplification_substitution) flags += "--simplification_substitution ";
    if (options.no_asm) flags += "--no_asm ";
    if (options.no_init) flags += "--no_init ";

    try {
        let b = await exec("circom " + flags + fileName);
        if (options.verbose) {
            console.log(b.stdout);
        }
        if (b.stderr) {
            console.error(b.stderr);
        }
    } catch (e) {
        throw new Error("circom compiler error: " + e);
    }

    if (options.c) {
        const c_folder = path.join(options.output, baseName + "_cpp/")
        let b = await exec("make -C " + c_folder);
        if (b.stderr) {
            console.error(b.stderr);
        }
    }
}


class BaseTester {
    constructor(dir, baseName) {
        this.dir = dir;
        this.baseName = baseName;
    }

    async release() {
        await this.dir.cleanup();
    }

    async loadSymbols() {
        if (this.symbols) return;
        this.symbols = {};
        const symsStr = await fs.promises.readFile(
            path.join(this.dir, this.baseName + ".sym"),
            "utf8"
        );
        const lines = symsStr.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const arr = lines[i].split(",");
            if (arr.length !== 4) continue;
            this.symbols[arr[3]] = {
                labelIdx: Number(arr[0]),
                varIdx: Number(arr[1]),
                componentIdx: Number(arr[2]),
            };
        }
    }

    async loadConstraints() {
        const self = this;
        if (this.constraints) return;
        const r1cs = await readR1cs(path.join(this.dir, this.baseName + ".r1cs"), {
            loadConstraints: true,
            loadMap: false,
            getFieldFromPrime: (p, singlethread) => new F1Field(p)
        });
        self.F = r1cs.F;
        self.nVars = r1cs.nVars;
        self.constraints = r1cs.constraints;
    }

    async assertOut(actualOut, expectedOut) {
        const self = this;
        if (!self.symbols) await self.loadSymbols();

        checkObject("main", expectedOut);

        function checkObject(prefix, eOut) {

            if (Array.isArray(eOut)) {
                for (let i = 0; i < eOut.length; i++) {
                    checkObject(prefix + "[" + i + "]", eOut[i]);
                }
            } else if (typeof eOut === "object" && eOut.constructor.name === "Object") {
                for (let k in eOut) {
                    checkObject(prefix + "." + k, eOut[k]);
                }
            } else {
                if (typeof self.symbols[prefix] === "undefined") {
                    throw new Error("Output variable not defined: " + prefix);
                }
                const ba = actualOut[self.symbols[prefix].varIdx].toString();
                const be = eOut.toString();
                if (ba !== be) {
                    throw new Error(`Assertion failed for ${prefix}: expected ${be}, got ${ba}`);
                }
            }
        }
    }

    async getDecoratedOutput(witness) {
        const self = this;
        const lines = [];
        if (!self.symbols) await self.loadSymbols();
        for (let n in self.symbols) {
            let v;
            if (witness[self.symbols[n].varIdx] !== undefined) {
                v = witness[self.symbols[n].varIdx].toString();
            } else {
                v = "undefined";
            }
            lines.push(`${n} --> ${v}`);
        }
        return lines.join("\n");
    }

    async getOutput(witness, output, templateName = "main") {
        const self = this;
        if (!self.symbols) await self.loadSymbols();

        let prefix = "main";
        if (templateName !== "main") {
            const regex = new RegExp(`^.*${templateName}[^.]*\.[^.]+$`);
            Object.keys(self.symbols).find((k) => {
                if (regex.test(k)) {
                    prefix = k.replace(/\.[^.]+$/, "");
                    return true;
                }
            });
        }

        return get_by_prefix(prefix, output);

        function get_by_prefix(prefix, out) {
            if (typeof out === "object" && out.constructor.name === "Object") {
                return Object.fromEntries(
                    Object.entries(out).map(([k, v]) => [
                        k,
                        get_by_prefix(`${prefix}.${k}`, v),
                    ])
                );
            } else if (Array.isArray(out)) {
                if (out.length === 1) {
                    return get_by_prefix(prefix, out[0]);
                } else if (out.length === 0 || out.length > 2) {
                    throw new Error(`Invalid output format: ${prefix} ${out}`);
                }

                return Array.from({ length: out[0] }, (_, i) =>
                    get_by_prefix(`${prefix}[${i}]`, out[1])
                );
            } else {
                if (out === 1) {
                    const name = `${prefix}`;
                    if (typeof self.symbols[name] == "undefined") {
                        throw new Error(`Output variable not defined: ${name}`);
                    }
                    return witness[self.symbols[name].varIdx];
                } else {
                    return Array.from({ length: out }, (_, i) => {
                        const name = `${prefix}[${i}]`;
                        if (typeof self.symbols[name] == "undefined") {
                            throw new Error(`Output variable not defined: ${name}`);
                        }
                        return witness[self.symbols[name].varIdx];
                    });
                }
            }
        }
    }

    async checkConstraints(witness) {
        const self = this;
        if (!self.constraints) await self.loadConstraints();
        const F = self.F;
        for (let i = 0; i < self.constraints.length; i++) {
            const constraint = self.constraints[i];
            const a = evalLC(constraint[0]);
            const b = evalLC(constraint[1]);
            const c = evalLC(constraint[2]);
            if (!F.isZero(F.sub(F.mul(a, b), c))) {
                throw new Error("Constraint doesn't match");
            }
        }

        function evalLC(lc) {
            const F = self.F;
            let v = F.zero;
            for (let w in lc) {
                v = F.add(
                    v,
                    F.mul(lc[w], F.e(witness[w]))
                );
            }
            return v;
        }
    }

}

function version_to_list(v) {
    return v.split(".").map((x) => parseInt(x, 10));
}

function check_versions(v1, v2) {
    //check if v1 is newer than or equal to v2
    for (let i = 0; i < v2.length; i++) {
        if (v1[i] > v2[i]) return true;
        if (v1[i] < v2[i]) return false;
    }
    return true;
}

async function compiler_above_version(v) {
    const output = (await exec("circom --version")).stdout;
    const compiler_version = version_to_list(output.slice(output.search(/\d/), -1));
    const vlist = version_to_list(v);
    return check_versions(compiler_version, vlist);
}

module.exports = { BaseTester, version_to_list, check_versions, compile, compiler_above_version, parseOptionsAndCompile };