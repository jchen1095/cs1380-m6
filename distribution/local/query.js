

const process = (input, callback) => {
    try {
        console.log("input is:", input);
        const ngrams = input.split('\n');
        const number = ngrams.length;
        let count = 0;
        console.log("length: ", number);
        const out = {};
        console.log("ngrams:", ngrams);
        ngrams.forEach(ngram => {
            try {
                global.distribution.local.index.get(ngram, (err, value) => {
                    count++;
                    console.log("Index v:", value);
                    console.log("Index err:", err);
                    // output: array, value = [{url: url, freq: freq}, {url: url, freq: freq}]
                    if (err) {
                        return;
                        // console.log('error in local store get', err);
                        // if error, assume does not exist
                        // callback(null, null);
                    }
                    console.log("value is:", value);
                    // const ngramData = JSON.parse(value);
                    out[ngram] = value
                    // results.push({[ngram]: value});
                    if (count >= ngrams.length){
                        console.log('done w the ngrams in local query');
                        callback(null, out);
                    }
                });
            } catch (err) {
                console.log("issue with store get:", err);
            } 
        });        
    } catch (e) {
        callback(new Error('noooooooo ' + e), null);
    }
}

module.exports = { process }