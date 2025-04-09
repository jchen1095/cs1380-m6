#!/bin/bash

echo "[Debug] Argument passed to invert.sh: $1" >&2  # Print the first argument
echo "[Debug] All arguments passed: $@" >&2 


# Step 1: Download URL content and save it to step1_raw.txt
echo "[Step 1] Downloading URL content..."
curl -s -k "$1" | tee step1_raw.txt | 
c/process.sh | tee step2_processed.txt |
c/stem.js | tee step3_stemmed.txt |
c/combine.sh | tee step4_ngrams.txt |
c/invert.sh "$1" | tee step5_inverted.txt |
# c/merge.js d/global-index.txt | tee step6_merged.txt |
# echo "[Step 7] Sorting final global index..." >&2
# sort -o d/global-index.txt
cat step5_inverted.txt
