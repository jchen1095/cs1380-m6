#!/usr/bin/env node

const readline = require('readline');
const { load } = require('cheerio');  // cheerio
const { URL } = require('url');

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

rl.on('line', (line) => {
  htmlString += line;
});

const parseLink = (baseURL, link) => {
  try {
    if (link.startsWith('/')) {
      const base = new URL(baseURL);
      return base.origin + link.split('?')[0].replace(/\/+/g, '/');
    }
    const url = new URL(link, baseURL);  // handles relative URLs
    return url.toString().split('?')[0].replace(/\/+/g, '/');
  } catch {
    return null;  // skip invalid URLs
  }
};

rl.on('close', () => {
  const $ = load(htmlString);
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const parsed = parseLink(baseURL, href);
    if (parsed) console.log(parsed);
  });
});