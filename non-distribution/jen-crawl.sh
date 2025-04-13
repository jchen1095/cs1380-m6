#!/bin/bash
curl -skL "$1" |
tee >(c/getURLs.js "$1" >&2) |
c/getText.js |
c/process.sh | 
c/stem.js    | 
c/combine.sh | 
c/invert.sh "$1" 
