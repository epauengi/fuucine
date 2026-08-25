import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import { SWRConfig } from "swr";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          dedupingInterval: 120_000,
          shouldRetryOnError: false,
        }}
      >
        <App />
      </SWRConfig>
    </MotionConfig>
  </React.StrictMode>,
);
