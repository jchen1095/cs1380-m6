#!/usr/bin/env node

/*
Search the inverted index for a particular (set of) terms.
Usage: ./query.js your search terms

The behavior of this JavaScript file should be similar to the following shell pipeline:
grep "$(echo "$@" | ./c/process.sh | ./c/stem.js | tr "\r\n" "  ")" d/global-index.txt

Here is one idea on how to develop it:
1. Read the command-line arguments using `process.argv`. A user can provide any string to search for.
2. Normalize, remove stopwords from and stem the query string — use already developed components
3. Search the global index using the processed query string.
4. Print the matching lines from the global index file.

Examples:
./query.js A     # Search for "A" in the global index. This should return all lines that contain "A" as part of an 1-gram, 2-gram, or 3-gram.
./query.js A B   # Search for "A B" in the global index. This should return all lines that contain "A B" as part of a 2-gram, or 3-gram.
./query.js A B C # Search for "A B C" in the global index. This should return all lines that contain "A B C" as part of a 3-gram.

Note: Since you will be removing stopwords from the search query, you will not find any matches for words in the stopwords list.

The simplest way to use existing components is to call them using execSync.
For example, `execSync(`echo "${input}" | ./c/process.sh`, {encoding: 'utf-8'});`
*/


const {execSync} = require('child_process');


function query(indexFile, args) {
  // parse query from args
  let term = '';
  for (let i = 0; i < args.length; i++) {
    term += `${args[i].trim()} `;
  }

  term = term.trim().toLowerCase();

  term = execSync(`echo "${args.join(' ')}" | bash c/process.sh | c/stem.js`,
      {encoding: 'utf-8'});

  const q = term.trim();

  const results = execSync(`grep "${q}" ${indexFile}`);

  const indexEntries = results.toString().trim().split('\n');

  const queryUrlSet = new Set();
  const queryToUrlAndNum = {};

  //   console.error(indexEntries)
  for (const entry of indexEntries) {
    const splitEntry = entry.split('|');
    const term = splitEntry[0].trim();
    const urls = splitEntry[1].trim();
    const splitUrls = urls.split(' ');
    // console.error(splitUrls)
    for (let i = 0; i < splitUrls.length; i += 2) {
      queryUrlSet.add(splitUrls[i]);

      if (!(term in queryToUrlAndNum)) {
        queryToUrlAndNum[term] = {};
      }
      queryToUrlAndNum[term][splitUrls[i]] = splitUrls[i+1];
    }
  }
  //   console.error(queryUrlSet)

  const urlToWordCount = {};
  for (const uniqueUrl of queryUrlSet) {
    const results = execSync(`grep "${uniqueUrl}" d/tf-idf-word-counts.txt`)
        .toString().split('\n')[0].trim().split('|')[1];
    const count = parseInt(results);
    urlToWordCount[uniqueUrl] = count;
  }
  //   console.error(urlToWordCount)

  const numDocs = parseInt(execSync(`wc -l < d/tf-idf-word-counts.txt`).toString().trim());
  //   console.error(numDocs)

  const scores = {};

  for (const entry of indexEntries) {
    const splitEntry = entry.split('|');
    const term = splitEntry[0].trim();
    const urls = splitEntry[1].trim();
    const splitUrls = urls.split(' ');
    // console.error(splitUrls)
    for (let i = 0; i < splitUrls.length; i += 2) {
      if (!(term in scores)) {
        scores[term] = {};
      }
      // console.error(`No times: ${queryToUrlAndNum[term][splitUrls[i]]}`);
      // console.error(`No terms in doc: ${urlToWordCount[splitUrls[i]]}`);
      // console.error(`No docs: ${numDocs}`);
      // console.error(`No docs with term: ${Object.keys(queryToUrlAndNum[term]).length}`);


      scores[term][splitUrls[i]] = (queryToUrlAndNum[term][splitUrls[i]]/urlToWordCount[splitUrls[i]])*Math.log(numDocs/Object.keys(queryToUrlAndNum[term]).length);
    }
  }
  for (const term in scores) {
    let termString = `${term} |`;
    // console.error(scores)
    for (const URL in scores[term]) {
      termString += ` ${URL} ${scores[term][URL]}`;
    }
    console.error(termString);
  }
}

const args = process.argv.slice(2); // Get command-line arguments
if (args.length < 1) {
  console.error('Usage: ./query.js [query_strings...]');
  process.exit(1);
}

const indexFile = 'd/tf-idf-global-index.txt'; // Path to the global index file
query(indexFile, args);
