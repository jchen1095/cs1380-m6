const { execSync } = require('child_process');
const { id } = require('../util/util');
const fs = require("fs");

// Reopen URL queue and stuff
try {
    const sid = id.getSID({ ip: "0.0.0.0", port: 12345 })
    const fd1 = fs.openSync(`./d/${sid}-visited.txt`, 'w');
    const fd2 = fs.openSync(`./${sid}-url-queue.txt`, 'w');
    const fd3 = fs.openSync(`./d/${sid}-docCount.txt`, 'w');
    const fd4 = fs.openSync(`./d/${sid}-totalCount.txt`, 'w');
    fs.closeSync(fd1);
    fs.closeSync(fd2);
    fs.closeSync(fd3);
    fs.closeSync(fd4);
} catch (e) {
    console.log("Error while opening visited and URL queue files.", e);
    process.exit(1);
}

console.log(`Running distribution.js on port 12345...`);

execSync(`node ../distribution.js --ip 0.0.0.0 --port 12345}`, {
    stdio: 'inherit'
});