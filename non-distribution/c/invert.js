#!/usr/bin/env node

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
});
const src = process.argv[2];

let tokens = '';
rl.on('line', (line)=>{
  const token = line.trim().toLowerCase();
  tokens += `${token}\n`;
});

rl.on('close', () => {
  const counts = new Map();
  tokens
      .split('\n') // split lines
      .map((tok) => tok.trim()) // clean around
      .filter((tok) => tok.length > 0) // remove empty lines
      .map((tok) => tok.replace(/\s+/g, ' ').trim()) // format whitespace
      .forEach((tok) => {
        counts.set(tok, (counts.get(tok) || 0) + 1);
      }); // add to map

  const outputLines = [];
  counts.forEach((c, str) => {
    outputLines.push(`${str} | ${c} | ${src}`);
  });
  outputLines.sort();
  for (const line of outputLines) {
    console.log(line);
  }
});
