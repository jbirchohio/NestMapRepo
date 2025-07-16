import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import 'mapbox-gl/dist/mapbox-gl.css';

// Initialize the root element for React
const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found in the document!");
}

// Render just the App component without any providers
createRoot(root).render(
  <div style={{ minHeight: '100vh' }}>
    <App />
  </div>
);
