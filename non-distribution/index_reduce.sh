#!/bin/bash

echo "[Debug] Argument passed to invert.sh: $1" >&2  # Print the first argument
echo "[Debug] All arguments passed: $@" >&2 

c/merge.js "$1" | tee step6_merged.txt |
# echo "[Step 7] Sorting final global index..." >&2
sort -o "$1" |
cat step5_inverted.txt