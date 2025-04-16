const { fs } = require('fs');
const { path } = require('path');
const local = require('./local');

const process = (input, callback) => {
    try {
        
        const results = [];
        console.log("input is:", input);
        const ngrams = input.split('\n');
        ngrams.forEach(ngram => {
            try {
                distribution.local.store.get({key: ngram, gid: "ngrams"}, (err, value) => {

                    // output: array, value = [{url: url, freq: freq}, {url: url, freq: freq}]
                    if (err) {
                        return;
                        // console.log('error in local store get', err);
                        // if error, assume does not exist
                        // callback(null, null);
                    }
                    console.log("value is:", value);
                    // const ngramData = JSON.parse(value);
                    results.push({[ngram]: value});
                });
            } catch (err) {
                console.log("issue with store get:", err);
            }
        });
        callback(null, results);
    } catch (e) {
        callback(new Error('noooooooo ' + e), null);
    }
}

module.exports = { process }