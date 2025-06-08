// scripts/verifyRoutes.ts
import fs from "fs";
import path from "path";

const ROUTES_DIR = path.resolve("server", "routes");
if (!fs.existsSync(ROUTES_DIR)) {
  console.warn("❗ No server/routes folder found.");
  process.exit(0);
}

const routeFiles = fs.readdirSync(ROUTES_DIR);
console.log(`🔍 Found ${routeFiles.length} route files...`);

for (const file of routeFiles) {
  const fullPath = path.join(ROUTES_DIR, file);
  try {
    const mod = require(fullPath);
    if (!mod.router && !mod.default) {
      console.warn(`⚠️  No export found in ${file}`);
    }
  } catch (err) {
    console.error(`❌ Error loading ${file}:`, err.message);
  }
}
