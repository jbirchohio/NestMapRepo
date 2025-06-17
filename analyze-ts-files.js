const fs = require('fs/promises');
const path = require('path');
const ts = require('typescript');

// Configuration
const TSCONFIG_PATH = path.join(process.cwd(), 'client', 'tsconfig.json');
const OUTPUT_FILE = path.join(process.cwd(), 'ts-errors-summary.json');
const MAX_FILES_PER_BATCH = 10;

// Track statistics
const stats = {
  totalIssues: 0,
  byCategory: {},
  byFile: {},
  byCode: {},
  startTime: Date.now()
};

// Common error code descriptions
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

function formatMemoryUsage() {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  return `${Math.round(used * 100) / 100} MB`;
}

async function processFile(program, fileName) {
  const diagnostics = [
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
    ...program.getDeclarationDiagnostics()
  ];

  const fileStats = {
    issues: [],
    count: 0
  };

  for (const diag of diagnostics) {
    const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
    const code = diag.code;
    const category = ts.DiagnosticCategory[diag.category];
    
    // Update stats
    stats.totalIssues++;
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    stats.byFile[fileName] = (stats.byFile[fileName] || 0) + 1;
    stats.byCode[code] = (stats.byCode[code] || 0) + 1;
    
    // Add to file stats
    fileStats.issues.push({
      code,
      message,
      category,
      description: getErrorDescription(code)
    });
    fileStats.count++;
    
    // Early exit if too many issues
    if (fileStats.count > 100) {
      fileStats.issues.push({
        code: 'TOO_MANY_ISSUES',
        message: `Too many issues (${diagnostics.length} total), showing first 100`,
        category: 'Message',
        description: 'The file has too many issues to display all of them.'
      });
      break;
    }
  }
  
  return fileStats;
}

async function processBatch(fileNames, options) {
  const program = ts.createProgram({
    rootNames: fileNames,
    options: options,
    projectReferences: undefined,
    host: undefined,
    configFileParsingDiagnostics: []
  });
  
  const results = {};
  
  for (const fileName of fileNames) {
    try {
      const fileStats = await processFile(program, fileName);
      if (fileStats.count > 0) {
        results[fileName] = fileStats;
      }
    } catch (error) {
      console.error(`❌ Error processing ${fileName}:`, error.message);
    }
    
    // Force garbage collection every few files
    if (global.gc && Math.random() < 0.2) {
      global.gc();
    }
  }
  
  return results;
}

async function analyzeProject() {
  try {
    console.log('🔍 Reading TypeScript configuration...');
    
    // Read and parse tsconfig
    const configFileContent = await fs.readFile(TSCONFIG_PATH, 'utf8');
    const configFile = ts.parseConfigFileTextToJson(TSCONFIG_PATH, configFileContent);
    
    if (configFile.error) {
      console.error('❌ Error parsing tsconfig.json:', configFile.error.messageText);
      process.exit(1);
    }
    
    const config = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(TSCONFIG_PATH)
    );
    
    if (config.errors && config.errors.length > 0) {
      console.error('❌ Error processing tsconfig.json:');
      config.errors.forEach(error => console.error(error.messageText));
      process.exit(1);
    }

    console.log(`📂 Found ${config.fileNames.length} source files`);
    
    // Process files in batches
    const allResults = {};
    const batchSize = MAX_FILES_PER_BATCH;
    
    for (let i = 0; i < config.fileNames.length; i += batchSize) {
      const batch = config.fileNames.slice(i, i + batchSize);
      console.log(`\n🔍 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(config.fileNames.length / batchSize)} (${batch.length} files)`);
      
      const batchResults = await processBatch(batch, config.options);
      Object.assign(allResults, batchResults);
      
      console.log(`   ✅ Processed ${Object.keys(batchResults).length} files with issues (${formatMemoryUsage()} used)`);
      
      // Force garbage collection after each batch
      if (global.gc) {
        global.gc();
      }
    }
    
    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      executionTime: `${((Date.now() - stats.startTime) / 1000).toFixed(2)} seconds`,
      totalFiles: config.fileNames.length,
      filesWithIssues: Object.keys(allResults).length,
      totalIssues: stats.totalIssues,
      byCategory: Object.entries(stats.byCategory)
        .sort((a, b) => b[1] - a[1])
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
      byCode: Object.entries(stats.byCode)
        .sort((a, b) => b[1] - a[1])
        .reduce((acc, [k, v]) => ({
          ...acc,
          [k]: { count: v, description: getErrorDescription(k) }
        }), {})
    };
    
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(summary, null, 2));
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ ANALYSIS COMPLETE');
    console.log('='.repeat(80));
    console.log(`📊 Total issues found: ${stats.totalIssues}`);
    console.log(`📂 Files with issues: ${Object.keys(allResults).length}/${config.fileNames.length}`);
    console.log(`⏱️  Execution time: ${summary.executionTime}`);
    console.log(`💾 Memory usage: ${formatMemoryUsage()}`);
    console.log(`📄 Summary saved to: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
    
    // Print top issues
    console.log('\n📊 Top error types:');
    Object.entries(summary.byCode)
      .slice(0, 10)
      .forEach(([code, data]) => {
        const percentage = ((data.count / stats.totalIssues) * 100).toFixed(1);
        console.log(`  [${code}] ${data.description}: ${data.count} (${percentage}%)`);
      });
    
  } catch (error) {
    console.error('\n❌ An error occurred during analysis:');
    console.error(error);
    process.exit(1);
  }
}

// Run the analysis
console.log('🚀 Starting TypeScript error analysis...');
console.log(`📊 Initial memory usage: ${formatMemoryUsage()}\n`);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('\n❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the analysis
analyzeProject().catch(error => {
  console.error('\n❌ Error during analysis:', error);
  process.exit(1);
});
