#!/usr/bin/env node

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
});

const tokens = [];
rl.on('line', (line)=>{
  const token = line.trim().toLowerCase();
  if (!(token in tokens)) {
    console.error(token);
    console.error(tokens);
    tokens.push(line);
  };
});

rl.on('close', ()=>{
  console.error(tokens);
  bigrams = [];
  if (tokens.length >= 2) {
    bigrams= nGram(tokens, 2);
  }
  trigrams = [];
  if (tokens.length >= 3) {
    trigrams= nGram(tokens, 3);
  }

  // const trigrams = nGram(tokens, 3);

  for (const word of tokens) {
    console.log(word);
  }
  for (const b of bigrams) {
    console.log(b);
  }
  for (const t of trigrams) {
    console.log(t);
  }
});

function nGram(tokens, n) {
  return tokens.map((_, i) => tokens.slice(i, i + n).join(' ')).filter((ngram) => ngram.split(' ').length === n);
}
