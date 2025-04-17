import React, { useState } from 'react';
import './SearchBar.css';
import SearchItem from './SearchItem';
import './SearchItem.css';
import axios from 'axios';
const {deserialize} = require('deserialize');

function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    try {
      if (query === 'nikos') {
        setResults([
          { url: 'https://nikos.vasilak.is/', relevancy: 10000 },
        ]);
        return;
      }
      console.log("query")
      const res = await axios.get('http://localhost:3001/search', {
        params: { q: query },
      });
      console.log(res);
      const r = JSON.parse(res);
      console.log(r)
      setResults(res.data.result);
    } catch (err) {
      console.error('Search failed: ', err);
    }
  };

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." />
      <button id="search-button" onClick={handleSearch}>Search</button>
      {results && results.length > 0 && (<div id="results">{results.map(result => <SearchItem url={result.url} relevancy={result.relevancy} />)}</div>)}
      {/* TODO assume results are in a list */}
      {/* <ul>
        // {results.map((item, i) => (
          <li key={i}><SearchItem url={item.url} /></li>
        ))}
      </ul> */}
    </div>
  );
}

export default SearchBar;


// function SearchBar({ items }) {
//   const [searchTerm, setSearchTerm] = useState('');

//   const handleSearch = (event) => {
//     setSearchTerm(event.target.value);
//   };

//   const filteredItems = 
//   items.filter(item =>
//     item.name.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div>
//       <input
//         type="text"
//         placeholder="Search..."
//         value={searchTerm}
//         onChange={handleSearch}
//       />
//       <ul>
//         {filteredItems.map(
//             (
//               item,
//               index
//             ) => (
//               <SearchItem index={index} />
//             )
//           )}
//       </ul>
//     </div>
//   );
// }

// export default SearchBar;