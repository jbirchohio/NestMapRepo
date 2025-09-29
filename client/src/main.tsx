import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import 'mapbox-gl/dist/mapbox-gl.css';
import { registerSW } from 'virtual:pwa-register';
import "./lib/fetchInterceptor";

// Initialize the root element for React
const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found in the document!");
}

createRoot(root).render(<App />);

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Expose updater and notify the app to show a UI prompt
    (window as any).__updateSW = updateSW;
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    // Could emit a toast if desired
  },
});
