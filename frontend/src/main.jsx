import React from "react";
import ReactDOM from "react-dom/client";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
