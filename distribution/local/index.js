const fs = require('fs');
const path = require('path');
const id = require('../util/util').id;

if (!fs.existsSync('ngrams')) {
  fs.mkdirSync('ngrams', { recursive: true });
}
const rootPath = path.join('ngrams', ${id.getSID(global.nodeConfig)});
if (!fs.existsSync(rootPath)) {
  fs.mkdirSync(rootPath, { recursive: true });
}


function appendIndex(ngrams, callback) {
    console.log("append called")
    ngrams.forEach(n => {
        const ngram = Object.keys(n)[0];
        try {
            fs.appendFileSync(path.join(rootPath, ngram + '.txt'), n[ngram].url + '|' + n[ngram].freq + '\n');
        } catch(e) {
            fs.writeFileSync(path.join(rootPath, ngram + '.txt'), n[ngram].url + '|' + n[ngram].freq + '\n');
        }       
    });
    callback(null, true);
}

function get(ngram, callback) {
    try {
        indices = fs.readFileSync(path.join(rootPath, ngram + '.txt'), 'utf-8')
            .trim()
            .split('\n')
            .map(line => {
                const [url, freq] = line.split('|');
                return { url: url.trim(), freq: parseFloat(freq.trim(), 10) };
            });
        callback(null, indices);
    } catch (e) {
        // console.log('[Index] Error:', e.message)
        callback(e, []);
    }
}

module.exports = {
    appendIndex,
    get
};