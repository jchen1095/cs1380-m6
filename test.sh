curl -skL ${value} |
                tee >(c/process.sh | c/stem.js | c/combine.sh |
                    c/invert.sh step4_ngrams.txt | step5_inverted.txt) |
                c/getText.js
