const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, "../client/build")));

// Health check endpoint for Railway
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes - Import your existing routes here
// You'll need to convert your TypeScript routes to JavaScript or use a transpiler

// Placeholder API routes (replace with your actual converted routes)
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

app.get("/api/trips", (req, res) => {
  // Import your actual trip logic from the TypeScript files
  res.json({ message: "Trips endpoint - implement your actual logic here" });
});

app.get("/api/users", (req, res) => {
  // Import your actual user logic from the TypeScript files
  res.json({ message: "Users endpoint - implement your actual logic here" });
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NestMap server running on port ${PORT}`);
});

module.exports = app;