import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource-variable/geist-mono";
import "./styles.css";
import App from "./App";

// skrytí hero před vstupní animací, jen když animace opravdu poběží
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("anim");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
