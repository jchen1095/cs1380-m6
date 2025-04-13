import React, { useState } from 'react';
import './SearchBar.css';
import SearchItem from './SearchItem';
import './SearchItem.css';
import axios from 'axios';

function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    try {
      const res = await axios.get('http://localhost:3001/search', {
        params: { q: query },
      });
      setResults(res.data.result);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." />
      <button onClick={handleSearch}>Search</button>
      <p>{results}</p>
      {/* TODO assume results are in a list */}
      {/* <ul>
        {results.map((url, i) => (
          <li key={i}><a href={url}>{url}</a></li>
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