import "./App.css";
import { useState } from "react";
import bakeryData from "./assets/bakery-data.json";
import SearchItem from "./components/SearchItem";
import SearchBar from "./components/SearchBar";

function App() {
  // TODO: use useState to create a state variable to hold the state of the cart
  /* add your cart state code here */
  const [cartContents, setCartContents] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // function addToCart(newItemIdx) {
  //   setCartContents([...cartContents, newItemIdx]);
  //   setTotalPrice(totalPrice + bakeryData[newItemIdx].price);
  // }

  // function getCartContents() {
  //   if (cartContents.length === 0) {
  //     return <div>No items in cart!</div>;
  //   }
  //   return (
  //     <div>
  //       <ul>
  //         {cartContents.map((item, index) => (
  //           <li key={index}>{bakeryData[item].name}</li>
  //         ))}
  //       </ul>
  //       <p>Total price: ${totalPrice.toFixed(2)}</p>
  //     </div>
  //   );
  // }

  return (
    <div className="App">
      <div id="scrollable-container">
        <h1>The GOAT-enberg Project 🐐</h1>
        <SearchBar items={bakeryData} />
        {/* <div id="menu-container">
          {bakeryData.map(
            (
              item,
              index //  map bakeryData to BakeryItem components
            ) => (
              <BakeryItem index={index} addFunc={addToCart} /> // replace with BakeryItem component
            )
          )}
        </div> */}
      </div>
      {/* <div id="cart-container">
        <h2>Cart</h2>
        {getCartContents()}
      </div> */}
    </div>
  );
}

export default App;
