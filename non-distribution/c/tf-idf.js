#!/usr/bin/env node

// Edited version of merge() in order to

// process -> stem ->


const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({input: process.stdin});
const srcUrl = process.argv[2];
const globalIndex = 'd/tf-idf-global-index.txt';

const {execSync} = require('child_process');


let input = '';
rl.on('line', (line) => {
  input += `${line}\n`;
});

rl.on('close', () => {
  console.error(`input: ${input}`);
  const text = execSync(`echo "${input}" | c/process.sh | c/stem.js`);
  console.error(`text: ${text}`);
  console.error(`url: ${srcUrl}`);

  fs.appendFile('d/tf-idf-word-counts.txt', `${srcUrl}|${text.toString().split(/\s+/).length}\n`, () => {});
  const out = execSync(`echo "${text}" | c/combine.sh | c/invert.sh "${srcUrl}" | c/merge.js ${globalIndex}`);
  fs.writeFile(globalIndex, out, () => {});
});


// combine.sh | invert.sh | merge.sh


// let full_string = '';

// rl.on('line', (line) => {
//   full_string += `${line}\n`;
//   console.error(full_string)
// });

// rl.on('close', () => {
//   const final_tokens = [];
//   console.error(full_string);
//   const lines = full_string.normalize('NFD').toLowerCase()
//       .split('\n').filter((line)=> line.trim() !== '');
//   for (t of lines) {
//     const tokens = t.replace(/[^a-zA-Z ]/g, '').trim().split(' ');
//     for (token of tokens) {
//       final_tokens.push(token);
//     }
//   }
//   console.error(final_tokens);

//   fs.readFile('d/stopwords.txt', 'utf-8', (err1, data) => {
//     if (err1) {
//       console.error('Failed to read file: ', err);
//       return;
//     }
//     // Filter out all stopwords
//     const toExclude = [];
//     split = data.split('\n');
//     for (l of split) {
//       toExclude.push(Stemmer.stem(l.trim()));
//     }
//     r = final_tokens.filter((token) => !(token in toExclude));

//     // TODO: Write no. of relevant words to doc_count.txt
//     fs.appendFile("d/tf_idf_doc_count.txt", `${src}|${final_tokens.length.toString()}`, () => {})

//     // Build up n-grams from strings in the html (combine)

//     const bigrams= n_gram(r, 2);
//     const trigrams = n_gram(r, 3);
//     // console.error
//     const combinations = r.concat(bigrams, trigrams).join("\n");
//     console.error(combinations)

//     // invert to get counts
//     counts = new Map();
//     combinations
//         .split('\n') // split lines
//         .map((tok) => tok.trim()) // clean around
//         .filter((tok) => tok.length > 0) // remove empty lines
//         .map((tok) => tok.replace(/\s+/g, ' ').trim()) // format whitespace
//         .forEach((tok) => {
//           counts.set(tok, (counts.get(tok) || 0) + 1);
//         }); // add to map

//     local_index = [];
//     counts.forEach((c, str) => {
//       local_index.push(`${str} | ${c} | ${src}`);
//     });
//     localIndex.sort();

//     // merge
//     fs.readFile(process.argv[2], 'utf-8', printMerged);
//   });
// });

// function n_gram(tokens, n) {
//   return tokens.map((_, i) => tokens.slice(i, i + n).join(' ')).filter((ngram) => ngram.split(' ').length === n);
// }

// const printMerged = (err, data) => {
//   if (err) {
//     console.error('Error reading file:', err);
//     return;
//   }

//   // Split the data into an array of lines
//   const localIndexLines = localIndex.split('\n');
//   const globalIndexLines = data.split('\n');
//   localIndexLines.pop();
//   globalIndexLines.pop();

//   const local = {};
//   const global = {};

//   // 3. For each line in `localIndexLines`, parse them and add them to the `local` object where keys are terms and values contain `url` and `freq`.
//   for (const line of localIndexLines) {
//     const tokens = line.split('|');
//     const term = tokens[0].trim();
//     const url = tokens[2].trim();
//     const freq = tokens[1].trim();

//     local[term] = {url, freq};
//   }

//   // 4. For each line in `globalIndexLines`, parse them and add them to the `global` object where keys are terms and values are arrays of `url` and `freq` objects.
//   // Use the .trim() method to remove leading and trailing whitespace from a string.
//   for (const line of globalIndexLines) {
//     const split = line.trim().split('|');
//     if (split.length > 0) {
//       const urlfs = [];
//       const term = split[0].trim();
//       const tokens = split[1].trim().split(' ');
//       if (tokens.length > 0) {
//         for (let i = 0; i < tokens.length; i += 2) {
//           const url = tokens[i].trim();
//           const freq = tokens[i+1].trim();
//           urlfs.push({url, freq});
//         }
//       }
//       global[term] = urlfs; // Array of {url, freq} objects
//     }
//   }

//   // 5. Merge the local index into the global index:
//   // - For each term in the local index, if the term exists in the global index:
//   //     - Append the local index entry to the array of entries in the global index.
//   //     - Sort the array by `freq` in descending order.
//   // - If the term does not exist in the global index:
//   //     - Add it as a new entry with the local index's data.
//   for (term in local) {
//     if (term in global) {
//       global[term].push(local[term]);
//       global[term].sort(compare);
//     } else {
//       global[term] = [local[term]];
//     }
//   }

//   // 6. Print the merged index to the console in the same format as the global index file:
//   //    - Each line contains a term, followed by a pipe (`|`), followed by space-separated pairs of `url` and `freq`.
//   for (term in global) {
//     let term_string = `${term} |`;
//     for (let i=0; i<global[term].length; i++) {
//       term_string += ` ${global[term][i].url} ${global[term][i].freq}`;
//     }

//     console.log(`${term_string}`);
//   }
// };

