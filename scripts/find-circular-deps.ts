import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

interface DependencyGraph {
  [file: string]: {
    imports: string[];
    visited: boolean;
    inPath: boolean;
  };
}

async function buildDependencyGraph(dir: string, graph: DependencyGraph = {}) {
  const SKIP_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage'];
  const files = await fs.readdir(dir, { withFileTypes: true });
  let processedFiles = 0;
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    // Skip ignored directories and files
    if (file.isDirectory()) {
      if (!SKIP_DIRS.includes(file.name)) {
        await buildDependencyGraph(fullPath, graph);
      }
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      process.stdout.write(`\rProcessing file ${++processedFiles}: ${file.name}...`);
      await processFile(fullPath, graph);
    }
  }
  
  if (processedFiles > 0) {
    process.stdout.write('\n');
  }
  
  return graph;
}

async function processFile(filePath: string, graph: DependencyGraph) {
  if (graph[filePath]) return;
  
  const content = await fs.readFile(filePath, 'utf-8');
  const imports = [];
  
  // Simple regex to find import statements
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (!importPath.startsWith('.')) continue; // Skip node_modules
    
    const absolutePath = await resolveImportPath(filePath, importPath);
    if (absolutePath) {
      imports.push(absolutePath);
    }
  }
  
  graph[filePath] = {
    imports,
    visited: false,
    inPath: false
  };
  
  // Process imported files
  for (const imp of imports) {
    if (!graph[imp]) {
      try {
        await processFile(imp, graph);
      } catch (err) {
        // Skip files we can't process
      }
    }
  }
}

async function resolveImportPath(fromPath: string, importPath: string): Promise<string | null> {
  try {
    const dir = path.dirname(fromPath);
    let fullPath = path.resolve(dir, importPath);
    
    // Try with .ts/.tsx extensions if needed
    if (!path.extname(fullPath)) {
      const tsPath = `${fullPath}.ts`;
      const tsxPath = `${fullPath}.tsx`;
      const indexTsPath = path.join(fullPath, 'index.ts');
      const indexTsxPath = path.join(fullPath, 'index.tsx');
      
      if (await fileExists(tsPath)) return tsPath;
      if (await fileExists(tsxPath)) return tsxPath;
      if (await fileExists(indexTsPath)) return indexTsPath;
      if (await fileExists(indexTsxPath)) return indexTsxPath;
      
      return null;
    }
    
    return fullPath;
  } catch (err) {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function findCycles(graph: DependencyGraph): string[][] {
  const cycles: string[][] = [];
  
  function visit(file: string, path: string[] = []): void {
    const node = graph[file];
    
    if (!node) return;
    
    if (node.inPath) {
      const cycleStart = path.indexOf(file);
      if (cycleStart !== -1) {
        cycles.push([...path.slice(cycleStart), file]);
      }
      return;
    }
    
    if (node.visited) return;
    
    node.visited = true;
    node.inPath = true;
    
    for (const imp of node.imports) {
      visit(imp, [...path, file]);
    }
    
    node.inPath = false;
  }
  
  for (const file of Object.keys(graph)) {
    if (!graph[file].visited) {
      visit(file);
    }
  }
  
  return cycles;
}

async function main() {
  const targetDir = process.argv[2] || '.';
  console.log(`Analyzing directory: ${targetDir}`);
  
  const graph = await buildDependencyGraph(path.resolve(targetDir));
  const cycles = findCycles(graph);
  
  if (cycles.length === 0) {
    console.log('No circular dependencies found!');
    return;
  }
  
  console.log(`\nFound ${cycles.length} circular dependency chain(s):\n`);
  
  for (let i = 0; i < cycles.length; i++) {
    console.log(`Cycle ${i + 1}:`);
    console.log(cycles[i].join(' -> '));
    console.log();
  }
}

main().catch(console.error);
