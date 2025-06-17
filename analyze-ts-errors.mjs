import ts from 'typescript';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Memory usage tracking
function formatMemoryUsage() {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  return `${Math.round(used * 100) / 100} MB`;
}

// Configuration
const TSCONFIG_PATH = path.join(process.cwd(), 'client', 'tsconfig.json');
const OUTPUT_FILE = path.join(process.cwd(), 'ts-errors.json');
const MAX_MEMORY_MB = 4500;
const CHUNK_SIZE = .25; // Number of files per batch
const MAX_ISSUES_PER_FILE = 50;

// Statistics tracker
const stats = {
  total: 0,
  byCategory: {},
  byFile: {},
  byCode: {}
};

// Error descriptions
const ERROR_CODES = {
  '2307': 'Cannot find module',
  '6133': 'Variable is declared but never used',
  '2322': 'Type is not assignable',
  '7006': 'Parameter implicitly has an any type',
  '2339': 'Property does not exist on type',
  '2345': 'Argument type is not assignable to parameter type',
  '2554': 'Incorrect number of arguments',
  '2741': 'Property is missing in type',
  '2769': 'No overload matches this call',
  '18048': 'Type is not assignable to type'
};

function getErrorDescription(code) {
  return ERROR_CODES[code] || `Error code ${code}`;
}

function formatDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  const file = diagnostic.file;
  let line, character, sourceText;

  if (file && typeof diagnostic.start === 'number') {
    const pos = file.getLineAndCharacterOfPosition(diagnostic.start);
    line = pos.line + 1;
    character = pos.character + 1;
    sourceText = typeof file.text === 'string'
      ? file.text.substring(diagnostic.start, diagnostic.start + 100)
      : '';
  }

  return {
    code: diagnostic.code,
    message,
    file: file ? file.fileName : 'unknown',
    line,
    character,
    sourceText,
    category: ts.DiagnosticCategory[diagnostic.category],
    description: getErrorDescription(diagnostic.code)
  };
}

function updateStats(diagnostic) {
  const file = diagnostic.file ? diagnostic.file.fileName : 'unknown';
  const category = ts.DiagnosticCategory[diagnostic.category];

  stats.total++;
  stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
  stats.byFile[file] = (stats.byFile[file] || 0) + 1;
  stats.byCode[diagnostic.code] = (stats.byCode[diagnostic.code] || 0) + 1;
}

async function analyzeFilesInBatches(fileNames, options) {
  const batches = [];
  for (let i = 0; i < fileNames.length; i += CHUNK_SIZE) {
    batches.push(fileNames.slice(i, i + CHUNK_SIZE));
  }

  let allDiagnostics = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n🔍 Processing batch ${i + 1}/${batches.length} (${batch.length} files)`);

    const program = ts.createProgram({
      rootNames: batch,
      options
    });

    for (const sourceFilePath of batch) {
      const sourceFile = program.getSourceFile(sourceFilePath);
      try {
        console.log(`📄 Processing file: ${sourceFilePath}`);

        if (!sourceFile) {
          console.warn(`⚠️ Skipping missing source file: ${sourceFilePath}`);
          continue;
        }

        const fileDiagnostics = [
          ...program.getSyntacticDiagnostics(sourceFile),
          ...program.getSemanticDiagnostics(sourceFile),
          ...program.getDeclarationDiagnostics(sourceFile)
        ];

        allDiagnostics.push(...fileDiagnostics.slice(0, MAX_ISSUES_PER_FILE));
      } catch (error) {
        console.error(`❌ Error processing ${sourceFilePath}:`, error.message);
      }

      if (global.gc) {
        global.gc();
        const used = process.memoryUsage().heapUsed / 1024 / 1024;
        if (used > MAX_MEMORY_MB) {
          console.log(`⚠️ High memory usage (${used.toFixed(2)}MB), skipping to next batch`);
          break;
        }
      }
    }

    if (global.gc) {
      global.gc();
      console.log(`✅ Finished batch (${formatMemoryUsage()} used)`);
    }
  }

  return allDiagnostics;
}

async function analyzeProject() {
  const startTime = performance.now();

  try {
    console.log('🔍 Reading TypeScript config...');
    const configText = await fs.readFile(TSCONFIG_PATH, 'utf8');
    const parsedJson = ts.parseConfigFileTextToJson(TSCONFIG_PATH, configText);

    if (parsedJson.error) {
      throw new Error(parsedJson.error.messageText);
    }

    const parsed = ts.parseJsonConfigFileContent(parsedJson.config, ts.sys, path.dirname(TSCONFIG_PATH));
    if (parsed.errors.length > 0) {
      parsed.errors.forEach(e => console.error(ts.flattenDiagnosticMessageText(e.messageText, '\n')));
      throw new Error('tsconfig parsing failed');
    }

    const fileNames = parsed.fileNames;
    console.log(`📁 Found ${fileNames.length} files. Analyzing...`);

    const diagnostics = await analyzeFilesInBatches(fileNames, parsed.options);

    const globalProgram = ts.createProgram([], parsed.options);
    diagnostics.push(...globalProgram.getGlobalDiagnostics());

    const formatted = [];
    for (const d of diagnostics) {
      updateStats(d);
      formatted.push(formatDiagnostic(d));
    }

    const sortedFiles = Object.entries(stats.byFile).sort((a, b) => b[1] - a[1]);
    const time = ((performance.now() - startTime) / 1000).toFixed(2);

    const output = {
      timestamp: new Date().toISOString(),
      stats: {
        executionTime: `${time}s`,
        memoryUsage: formatMemoryUsage(),
        totalFiles: fileNames.length,
        totalIssues: stats.total,
        issuesPerFile: (stats.total / fileNames.length).toFixed(2)
      },
      summary: {
        byCategory: stats.byCategory,
        byFile: Object.fromEntries(sortedFiles),
        byCode: stats.byCode
      },
      issues: formatted
    };

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));

    console.log('\n✅ Analysis complete!');
    console.log(`📊 Total issues: ${stats.total}`);
    console.log(`💾 Saved to ${OUTPUT_FILE}`);
    console.log(`⏱️ Took ${time}s | Peak memory: ${formatMemoryUsage()}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

console.log('🚀 Starting TypeScript analysis...');
console.log(`📊 Memory: ${formatMemoryUsage()}`);

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err.message);
  process.exit(1);
});

analyzeProject();
