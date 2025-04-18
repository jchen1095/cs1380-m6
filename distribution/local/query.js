

function process(input, callback) {
    try {
        // console.log("input is:", input);
        const ngrams = input.split('\n');
        const number = ngrams.length;
        let count = 0;
        // console.log("length: ", number);
        const out = {};
        // console.log("ngrams:", ngrams);
        ngrams.forEach(ngram => {
            global.distribution.local.index.get(ngram.trim(), (err, value) => {
                count++;
                // console.log("Index v:", value);
                //console.log("Index err:", err);
                // output: array, value = [{url: url, freq: freq}, {url: url, freq: freq}]
                if (err) {
                    console.error('error in local store get for', ngram, err);
                }
                // console.log("value is:", value);
                // const ngramData = JSON.parse(value);
                out[ngram] = value
                // results.push({[ngram]: value});
                if (count >= number){
                    // console.log('done w the ngrams in local query');
                    callback(null, out);
                    
                }
            });
        });        
    } catch (e) {
        callback(new Error('noooooooo ' + e), null);
    }
}

module.exports = { process };