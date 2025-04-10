// TODO: create a component that displays a single bakery item
import React, { useState } from "react";
import bakeryData from "../assets/bakery-data.json";
import "./BakeryItem.css";

function BakeryItem(props) {
  return (
    <div id="item-container">
      {/* <div id="item-pic">
        <img
          src={bakeryData[props.index].image}
          alt={bakeryData[props.index].name}
        ></img>
      </div> */}
      <div id="item-desc">
        <h3>{bakeryData[props.index].name}</h3>
        <p>{bakeryData[props.index].description}</p>
        <p>{bakeryData[props.index].price}</p>
        <button onClick={() => props.addFunc(props.index)}>Add to Cart</button>
      </div>
    </div>
  );
}

export default BakeryItem;
