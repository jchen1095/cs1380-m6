import React, { useState } from "react";
import "./SearchItem.css";

function SearchItem(props) {
  return (
    <div id="item-container">
      <div id="item-desc">
        <a href={props.url} target="_blank">{props.url}</a>
        <p id="relevancy">Relevancy: {props.relevancy}</p>
        {/* <button onClick={() => props.addFunc(props.index)}>Add to Cart</button> */}
      </div>
    </div>
  );
}

export default SearchItem;
