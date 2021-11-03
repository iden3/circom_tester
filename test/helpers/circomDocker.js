const { mkdtemp, rmdirSync } = require("fs");
const { tmpdir, userInfo } = require("os");
const { join, sep } = require("path");

module.exports = {
    getOptions,
};

async function getOptions(projectRoot = "") {
    const basedir = projectRoot || join(__dirname, "../../");
    const options = {
        basedir,
    };
    if (!!process.env.CIRCOM_DOCKER) {
        const tmpDir = await new Promise((res, rej) =>
            mkdtemp(`${tmpdir()}${sep}`, (err, folder) =>
                err ? rej(err) : res(folder)
            )
        );
        process.on("exit", () => rmdirSync(tmpDir, { recursive: true }));
        options.tmpdir = tmpDir;

        options.compiler = `docker run -i --rm -v ${basedir}:/data -v ${tmpDir}:${tmpDir} `;
        const { uid } = userInfo();
        if (!!uid) {
            options.compiler += `-v /etc/passwd:/etc/passwd:ro `;
            options.compiler += `-v /etc/group:/etc/group:ro `;
            options.compiler += `--user ${uid} `;
        }
        options.compiler += "aspiers/circom circom";
    }
    return Promise.resolve(options);
}
