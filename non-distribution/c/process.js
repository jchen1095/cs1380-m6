#!/usr/bin/env node

// Convert each line to one word per line,
// **remove non-letter characters**,
// make lowercase,
// convert to ASCII;
// then remove stopwords (inside d/stopwords.txt)

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
});

let fullString = '';

rl.on('line', (line) => {
  fullString += `${line}\n`;
});

rl.on('close', () => {
  const finalTokens = [];
  console.error(fullString);
  const lines = fullString.normalize('NFD').toLowerCase()
      .split('\n').filter((line)=> line.trim() !== '');
  for (const t of lines) {
    const tokens = t.replace(/[^a-zA-Z ]/g, '').trim().split(' ');
    for (const token of tokens) {
      finalTokens.push(token);
    }
  }
  console.error(finalTokens);

  fs.readFile('d/stopwords.txt', 'utf-8', (err1, data) => {
    if (err1) {
      console.error('Failed to read file: ', err1);
      return;
    }
    const toExclude = [];
    const split = data.split('\n');
    for (const l of split) {
      toExclude.push(l.trim());
    }
    const r = finalTokens.filter((token) => !(token in toExclude));
    for (const word of r) {
      console.log(word);
    }
  });
});

console.error(fullString);

