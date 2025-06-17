import { Project, ts } from 'ts-morph';
import * as path from 'path';
import type * as tsNode from 'typescript';

// Interface for TypeScript diagnostic information
interface DiagnosticInfo {
  file: string;
  code: number;
  message: string;
  line: number | undefined;
  character: number | undefined;
  category: ts.DiagnosticCategory;
  source: string;
  nodeText?: string;
  suggestion?: string;
}

// Track statistics
interface FixStatistics {
  totalIssues: number;
  fixedIssues: number;
  byCategory: Record<string, number>;
  byFile: Record<string, number>;
}

// Initialize statistics
const stats: FixStatistics = {
  totalIssues: 0,
  fixedIssues: 0,
  byCategory: {},
  byFile: {},
};

// Helper to get diagnostic category name
function getCategoryName(category: ts.DiagnosticCategory): string {
  return ts.DiagnosticCategory[category];
}

// Format diagnostic for console output
function formatDiagnostic(diag: DiagnosticInfo): string {
  return `[${diag.code}] ${diag.message}\n` +
    `  at ${diag.file}:${diag.line}:${diag.character}\n` +
    (diag.nodeText ? `  Code: ${diag.nodeText}\n` : '') +
    (diag.suggestion ? `  Suggestion: ${diag.suggestion}\n` : '');
}

// Process a single TypeScript diagnostic
function processDiagnostic(
  project: Project,
  diagnostic: tsNode.Diagnostic
): DiagnosticInfo {
  const messageText = typeof diagnostic.messageText === 'string' 
    ? diagnostic.messageText 
    : diagnostic.messageText.messageText;
  
  const sourceFile = diagnostic.file as tsNode.SourceFile | undefined;
  let line: number | undefined;
  let character: number | undefined;
  let nodeText: string | undefined;

  if (sourceFile) {
    const { line: l, character: c } = sourceFile.getLineAndCharacterOfPosition(
      diagnostic.start || 0
    );
    line = l + 1;
    character = c + 1;
    
    if (diagnostic.start !== undefined && diagnostic.length) {
      nodeText = sourceFile.text.substring(diagnostic.start, diagnostic.start + diagnostic.length);
    }
  }

  // Try to suggest fixes based on error code
  let suggestion: string | undefined;
  
  switch (diagnostic.code) {
    case 2307: // Cannot find module
      suggestion = 'Check if the module is installed and the path is correct.';
      break;
    case 6133: // 'variable' is declared but its value is never read
      suggestion = 'Remove the unused variable or use it in your code.';
      break;
    case 2322: // Type 'X' is not assignable to type 'Y'
      suggestion = 'Check the types and ensure they are compatible.';
      break;
    case 7006: // Parameter 'x' implicitly has an 'any' type
      suggestion = 'Add an explicit type annotation to the parameter.';
      break;
  }

  return {
    file: sourceFile?.fileName || 'unknown',
    code: diagnostic.code,
    message: messageText,
    line,
    character,
    category: diagnostic.category,
    source: ts.DiagnosticCategory[diagnostic.category],
    nodeText,
    suggestion,
  };
}

// Main function to analyze TypeScript errors
async function analyzeTypeScriptErrors() {
  console.log('🚀 Starting TypeScript error analysis...');
  
  // Initialize ts-morph project
  const project = new Project({
    tsConfigFilePath: path.join(process.cwd(), 'client', 'tsconfig.json'),
    skipAddingFilesFromTsConfig: false,
  });

  console.log(`📁 Project root: ${project.getRootDirectories()[0]?.getPath()}`);
  
  // Get all source files
  const sourceFiles = project.getSourceFiles();
  console.log(`📄 Found ${sourceFiles.length} source files`);
  
  // Get all diagnostics using TypeScript compiler API directly
  const program = project.getProgram().compilerObject;
  const allDiagnostics = program.getSemanticDiagnostics()
    .concat(program.getSyntacticDiagnostics())
    .concat(program.getDeclarationDiagnostics())
    .concat(program.getGlobalDiagnostics());
    
  stats.totalIssues = allDiagnostics.length;
  
  console.log(`\n🔍 Found ${allDiagnostics.length} TypeScript issues to analyze\n`);
  
  // Process all diagnostics
  const processedDiagnostics = allDiagnostics.map(diag => 
    processDiagnostic(project, diag)
  );
  
  // Group by file
  const byFile: Record<string, DiagnosticInfo[]> = {};
  processedDiagnostics.forEach(diag => {
    if (!byFile[diag.file]) {
      byFile[diag.file] = [];
    }
    byFile[diag.file].push(diag);
    
    // Update statistics
    stats.byCategory[diag.source] = (stats.byCategory[diag.source] || 0) + 1;
    stats.byFile[diag.file] = (stats.byFile[diag.file] || 0) + 1;
  });
  
  // Print summary
  console.log('📊 Summary by category:');
  Object.entries(stats.byCategory).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} issues`);
  });
  
  console.log('\n📊 Top files with most issues:');
  Object.entries(stats.byFile)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([file, count]) => {
      console.log(`  ${file}: ${count} issues`);
    });
  
  // Print detailed diagnostics for the first few files
  const filesToShow = Object.keys(byFile).slice(0, 3);
  
  for (const file of filesToShow) {
    console.log(`\n📄 ${file}:`);
    byFile[file].slice(0, 5).forEach(diag => {
      console.log('\n' + formatDiagnostic(diag));
    });
    
    if (byFile[file].length > 5) {
      console.log(`  ... and ${byFile[file].length - 5} more issues`);
    }
  }
  
  // Save results to a JSON file for further analysis
  const results = {
    timestamp: new Date().toISOString(),
    totalIssues: stats.totalIssues,
    byCategory: stats.byCategory,
    byFile: Object.entries(stats.byFile)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
    diagnostics: processedDiagnostics.slice(0, 1000), // Limit to first 1000 for file size
  };
  
  const fs = require('fs');
  const outputPath = path.join(process.cwd(), 'ts-errors.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ Analysis complete! Results saved to ${outputPath}`);
  console.log(`\n💡 Next steps:
  1. Review the most common error categories
  2. Focus on files with the most issues first
  3. Use the detailed diagnostics to identify patterns
  4. Consider enabling stricter TypeScript options in tsconfig.json`);
}

// Run the analysis
analyzeTypeScriptErrors().catch(console.error);
