const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const id = require('../util/util').id;

const MAX_CONCURRENT_WRITES = 50;
let activeWrites = 0;
const writeQueue = [];

const rootPath = path.join('ngrams', `${id.getSID(global.nodeConfig)}`);

if (!fs.existsSync('ngrams')) {
  fs.mkdirSync('ngrams', { recursive: true });
}
if (!fs.existsSync(rootPath)) {
  fs.mkdirSync(rootPath, { recursive: true });
}

function runNextWrite() {
  if (activeWrites >= MAX_CONCURRENT_WRITES || writeQueue.length === 0) return;

  const { filePath, content, resolve, reject } = writeQueue.shift();
  activeWrites++;

  fsp.appendFile(filePath, content)
    .then(resolve)
    .catch(reject)
    .finally(() => {
      activeWrites--;
      runNextWrite();
    });
}

function enqueueWrite(filePath, content) {
  return new Promise((resolve, reject) => {
    writeQueue.push({ filePath, content, resolve, reject });
    runNextWrite();
  });
}

async function appendIndex(ngrams, callback) {
  try {
    await fsp.mkdir('ngrams', { recursive: true });
    await fsp.mkdir(rootPath, { recursive: true });
  } catch (_) {}

  try {
    await Promise.all(
      ngrams.map(n => {
        const ngram = Object.keys(n)[0];
        const filePath = path.join(rootPath, `${ngram}.txt`);
        const line = `${n[ngram].url}|${n[ngram].freq}\n`;
        return enqueueWrite(filePath, line);
      })
    );
    callback?.(null, true);
  } catch (e) {
    callback?.(e, false);
  }
}

async function flushAllWrites() {
  const pending = [...writeQueue.values()];
  await Promise.allSettled(pending);
}

function get(ngram, callback) {
  try {
    const data = fs.readFileSync(path.join(rootPath, ngram + '.txt'), 'utf-8')
      .trim()
      .split('\n')
      .map(line => {
        const [url, freq] = line.split('|');
        return { url: url.trim(), freq: parseFloat(freq.trim(), 10) };
      });
    callback(null, data);
  } catch (e) {
    callback(e, []);
  }
}

module.exports = {
  appendIndex,
  get,
  flushAllWrites
};