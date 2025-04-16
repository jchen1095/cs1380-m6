#!/bin/bash
curl --range 0-10485759 -skL "$1" |
tee >(c/getURLs.js "$1" >&2) |
c/getText.js |
tee >(wc -w >&3) | 
c/process.sh | 
c/stem.js    | 
c/combine.sh | 
c/invert.sh "$1" 
