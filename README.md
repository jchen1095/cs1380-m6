# CSCI1380: Milestone 6

## How to Run Each Component
The main starting points to run our implementation of M6 are `m6-crawl.js` and `m6-query.js`. Both are located under the `distribution` folder, but **must** be run from inside the `non-distribution` folder (due to dependence on relative paths in scripts from M0). 

The starting crawl URL in `m6-crawl.js` is indicated inside the script. From there, the program will keep traversing the web graph until it reaches leaf nodes. Since we focused on crawling the Gutenberg project, only `.txt` files have their text actually parsed; the other pages (used for indexing) only have their URLs crawled for further indexing. One can stop the process using `^C`, but due to a bunch of crawls being queued, one should wait for the program to finish (and flush all writes for documents into the store).

The query script is `m6-query.js`; it takes a single argument corresponding to the token to be searched. It then fetches responses from different nodes and combines them to a single output for the given token in the search engine.

The `server` folder includes a server to respond to API calls from the frontend. Running `npm start` runs the server. The corresponding frontend is in the `client` folder, on the root of the project.

In the `experiments` folder, you can find multiple scripts for various things we've tried, especially related to testing AWS nodes.

## Summarize the process of writing the paper and preparing the poster, including any surprises you encountered.
There was definitely not as much room as we thought on the poster; it was challenging to try and include everything. We also struggled to plot the performance metrics due to the challenge of asynchronous flushes for text files. 

## Roughly, how many hours did M6 take you to complete?
Hours: 120