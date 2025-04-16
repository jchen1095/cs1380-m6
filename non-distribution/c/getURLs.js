#!/usr/bin/env node

/*
Extract all URLs from a web page.
Usage: ./getURLs.js <base_url>
*/

const readline = require('readline');
const {JSDOM} = require('jsdom');

// 1. Read the base URL from the command-line argument using `process.argv`.
let baseURL = process.argv[2];


if (baseURL.endsWith('index.html')) {
  baseURL = baseURL.slice(0, baseURL.length - 'index.html'.length);
} else {
  baseURL += '/';
}

const rl = readline.createInterface({
  input: process.stdin,
});

let htmlString = '';

const parseLink = (baseURL, link) => {
  if (link.startsWith('/')) {
    const baseURLStruct = new URL(baseURL);
    return baseURLStruct.origin + link.split('?')[0].replace(/\/+/g, '/');
  }
  const prot = baseURL.slice(0, 7);
  const rest = baseURL.slice(7) + link;
  return prot + rest.split('?')[0].replace(/\/+/g, '/');
};

rl.on('line', (line) => {
  // 2. Read HTML input from standard input (stdin) line by line using the `readline` module.
  htmlString+=line;
});

rl.on('close', () => {
  // 3. Parse HTML using jsdom
  const dom = new JSDOM(htmlString);
  // dom.window.document.querySelectorAll("a").forEach((link) => console.log(link));
  // console.log(dom.window.document.querySelectorAll("a"));
  Array.from(
      dom.window.document.querySelectorAll('a'))
      .map((a)=>a.href)
      .forEach((link) => console.log(parseLink(baseURL, link)));
  // 4. Find all URLs:
  //  - select all anchor (`<a>`) elements) with an `href` attribute using `querySelectorAll`.
  //  - extract the value of the `href` attribute for each anchor element.
  // 5. Print each absolute URL to the console, one per line.
});


