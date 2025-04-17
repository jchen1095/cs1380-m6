#!/bin/bash
curl --range 0-10485759 -skL "$1" | c/getURLs.js "$1" >&2