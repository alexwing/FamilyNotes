import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ScaleProvider } from "./context/ScaleContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <ScaleProvider>
          <App />
        </ScaleProvider>
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>
);
