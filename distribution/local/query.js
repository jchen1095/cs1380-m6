const { fs } = require('fs');
const { path } = require('path');
const local = require('./local');

const process = (input, callback) => {
    try {
        const ngrams = input?.ngrams || [];
        const results = [];

        ngrams.forEach(ngram => {
            try {
                local.store.get(ngram, (err, value) => {
                    // output: array, value = [{url: url, freq: freq}, {url: url, freq: freq}]
                    if (err) {
                        // if error, assume does not exist
                        return;
                    }
                    // const ngramData = JSON.parse(value);
                    results.push({[ngram]: value});
                });
            } catch (err) {
            }
        });
        callback(null, results);
    } catch (e) {
        callback(new Error('noooooooo ' + e), null);
    }
}

module.exports = { process }