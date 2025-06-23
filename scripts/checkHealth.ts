import { execSync } from "child_process";
import fs from "fs";
import path from "path";
const results: Record<string, any> = {};
const commands = {
    lint: "npx eslint . --ext .ts,.tsx --max-warnings=0",
    types: "npx tsc --noEmit",
    build: "npx vite build --logLevel silent",
    routes: "npx tsx scripts/verifyRoutes.ts",
};
for (const [key, cmd] of Object.entries(commands)) {
    try {
        execSync(cmd, { stdio: "pipe" });
        results[key] = { status: "passed" };
    }
    catch (err: any) {
        results[key] = {
            status: "failed",
            output: err.stdout?.toString() || err.message || "Unknown error",
        };
    }
}
const outputPath = path.join("scripts", "check_health_report.json");
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`✅ Health check complete. Output saved to ${outputPath}`);
