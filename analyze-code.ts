import { OpenAI } from "openai";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";
import { diffLines } from "diff";
import { spawn } from "child_process";
import minimist from "minimist";
import glob from "glob";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const assistantId = process.env.ASSISTANT_ID!;
const args = minimist(process.argv.slice(2));

const dryRun = args["dry-run"] || false;
const filePattern = args.files || "**/*.{ts,tsx,js,jsx,py}";
const rootDir = path.resolve("./src");

type FileSummary = {
  original: string;
  refactored: string | null;
  diffPath: string | null;
  changed: boolean;
  linesAdded: number;
  linesRemoved: number;
};
const summaries: FileSummary[] = [];

function getFiles(pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(pattern, {
      cwd: rootDir,
      absolute: true,
      ignore: ["**/node_modules/**", "**/.git/**"],
    }, (err, matches) => {
      if (err) reject(err);
      else resolve(matches);
    });
  });
}

async function analyzeFile(filePath: string, threadId: string) {
  const content = await fs.readFile(filePath, "utf-8");
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const dir = path.dirname(filePath);
  const outputPath = path.join(dir, `${baseName}.refactored${ext}`);
  const diffPath = path.join(dir, `${baseName}.diff.txt`);

  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: `Please rewrite and improve the following ${ext} code, fixing bugs, adding helpful comments, and improving clarity. Only return the updated code:\n\n${content}`,
  });

  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
  });

  let status = run.status;
  while (status !== "completed" && status !== "failed") {
    const updated = await openai.beta.threads.runs.retrieve(threadId, run.id);
    status = updated.status;
    if (status !== "completed") await new Promise(r => setTimeout(r, 2000));
  }

  const messages = await openai.beta.threads.messages.list(threadId);
  const response = messages.data.find(m => m.role === "assistant");
  const updatedCode = response?.content?.[0]?.text?.value;

  if (!updatedCode) {
    console.warn(`⚠️ No response for ${filePath}`);
    return;
  }

  if (!dryRun) {
    await fs.writeFile(outputPath, updatedCode);
    console.log(`💾 Saved: ${outputPath}`);
  }

  const diff = diffLines(content, updatedCode);
  const diffText = diff.map(part => {
    const prefix = part.added ? "+ " : part.removed ? "- " : "  ";
    return prefix + part.value;
  }).join("");

  if (!dryRun) {
    await fs.writeFile(diffPath, diffText);
    console.log(`📝 Diff saved: ${diffPath}`);
  }

  let linesAdded = 0;
  let linesRemoved = 0;
  for (const part of diff) {
    if (part.added) linesAdded += part.count || 0;
    else if (part.removed) linesRemoved += part.count || 0;
    const color = part.added ? "\x1b[32m" : part.removed ? "\x1b[31m" : "\x1b[0m";
    process.stdout.write(color + part.value + "\x1b[0m");
  }
  console.log("\n---");

  summaries.push({
    original: filePath,
    refactored: dryRun ? null : outputPath,
    diffPath: dryRun ? null : diffPath,
    changed: linesAdded + linesRemoved > 0,
    linesAdded,
    linesRemoved,
  });

  if (args["open"]) {
    spawn("code", [filePath, outputPath], { stdio: "ignore", detached: true }).unref();
  }
}

async function run() {
  const files = await getFiles(filePattern);
  const thread = await openai.beta.threads.create();

  console.log(`🚀 Found ${files.length} matching files.`);
  if (dryRun) console.log("🔍 Running in DRY RUN mode (no files will be saved).\n");

  for (const file of files) {
    console.log(`🔧 Processing: ${file}`);
    await analyzeFile(file, thread.id);
  }

  console.log("\n📋 SUMMARY REPORT:\n");
  summaries.forEach((summary, i) => {
    console.log(`${i + 1}. ${path.relative(process.cwd(), summary.original)}`);
    console.log(`   ➕ Added: ${summary.linesAdded} | ➖ Removed: ${summary.linesRemoved}`);
    console.log(`   📂 Refactored: ${summary.refactored || "(dry run)"}`);
    console.log(`   🧾 Diff: ${summary.diffPath || "(dry run)"}`);
    console.log(`   🔄 Changed: ${summary.changed ? "Yes" : "No"}\n`);
  });

  const totalChanged = summaries.filter(s => s.changed).length;
  console.log(`✅ ${totalChanged} of ${summaries.length} file(s) changed.`);
}

run().catch(console.error);
