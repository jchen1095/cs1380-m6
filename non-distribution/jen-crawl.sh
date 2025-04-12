#!/bin/bash
curl -skL "$1" |
tee >(c/getURLs.js "$1" >&2) |
c/getText.js |
c/process.sh | tee step2_processed.txt |
c/stem.js    | tee step3_stemmed.txt |
c/combine.sh | tee step4_ngrams.txt  |
c/invert.sh "$1" | tee step5_inverted.txt
