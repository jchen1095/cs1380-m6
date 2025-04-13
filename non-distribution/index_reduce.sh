#!/bin/bash

c/merge.js "$1" | tee step6_merged.txt |
# echo "[Step 7] Sorting final global index..." >&2
sort -o step6_merged.txt |
cat step6_merged.txt