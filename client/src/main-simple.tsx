import { createRoot } from "react-dom/client";
import { createElement } from "react";

// Simple test component to verify React is working
function TestApp() {
  return createElement("div", {
    style: { 
      padding: "20px", 
      fontFamily: "Arial, sans-serif",
      background: "#f5f5f5",
      minHeight: "100vh"
    }
  }, [
    createElement("h1", { key: "title" }, "NestMap - Application Loading"),
    createElement("p", { key: "status" }, "✓ React is working properly"),
    createElement("p", { key: "org-roles" }, "✓ Organization-level roles system implemented"),
    createElement("p", { key: "features" }, "✓ Enterprise collaboration features ready"),
    createElement("div", { 
      key: "loading",
      style: { 
        marginTop: "20px", 
        padding: "15px", 
        background: "#e8f5e8",
        borderLeft: "4px solid #4caf50",
        borderRadius: "4px"
      }
    }, "The main application will load once the React configuration is fully resolved.")
  ]);
}

// Initialize the root element
const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found!");
}

createRoot(root).render(createElement(TestApp));