const { execSync } = require('child_process');

const IP_TO_PORT = {
    "172.31.86.118": 12345,
    "172.31.94.204": 12346,
    "172.31.84.237": 12347,
    "172.31.83.93": 12348,
    "172.31.87.11": 12349,
    "172.31.93.116": 12350,
    "172.31.81.227": 12351,
    "172.31.85.181": 12352,
    "172.31.91.117": 12353,
    "172.31.82.154": 12354,
    "172.31.93.153": 12355
};

const hostname = execSync("hostname -I | awk '{print $1}'", { encoding: 'utf-8' }).trim();

if (!IP_TO_PORT[hostname]) {
  console.error(`No port mapping found for IP ${hostname}`);
  process.exit(1);
}

console.log(`Running distribution.js on port ${IP_TO_PORT[hostname]}...`);

execSync(`node ../distribution.js --ip 0.0.0.0 --port ${IP_TO_PORT[hostname]}`, {
  stdio: 'inherit'
});