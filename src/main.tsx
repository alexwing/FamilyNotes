import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TitleBar } from "./components/TitleBar";
import "./index.css";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ScaleProvider } from "./context/ScaleContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <ScaleProvider>
          <TitleBar />
          <App />
        </ScaleProvider>
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>
);
