const { execSync } = require('child_process');
const { id } = require('./util/util');
const fs = require("fs");

const IP_TO_PORT = {
    "172.31.89.20": 12345,
    "172.31.86.231": 12346,
    "172.31.86.152": 12347,
    "172.31.81.25": 12348,
    "172.31.84.219": 12349,
    "172.31.90.108": 12350,
    "172.31.83.205": 12351,
    "172.31.85.181": 12352,
    "172.31.93.189": 12353,
    "172.31.83.142": 12354,
    "172.31.86.31": 12355
};

const hostname = execSync("hostname -I | awk '{print $1}'", { encoding: 'utf-8' }).trim();

if (!IP_TO_PORT[hostname]) {
    console.error(`No port mapping found for IP ${hostname}`);
    process.exit(1);
}

// Reopen URL queue and stuff
try {
    const sid = id.getSID({ ip: "0.0.0.0", port: IP_TO_PORT[hostname] })
    const fd1 = fs.openSync(`./d/${sid}-visited.txt`, 'w');
    const fd2 = fs.openSync(`./${sid}-url-queue.txt`, 'w');
    const fd3 = fs.openSync(`./d/${sid}-docCount.txt`, 'w');
    fs.closeSync(fd1);
    fs.closeSync(fd2);
    fs.closeSync(fd3);
} catch (e) {
    console.log("Error while opening visited and URL queue files.", e);
    process.exit(1);
}

console.log(`Running distribution.js on port ${IP_TO_PORT[hostname]}...`);

execSync(`node ../distribution.js --ip 0.0.0.0 --port ${IP_TO_PORT[hostname]}`, {
    stdio: 'inherit'
});