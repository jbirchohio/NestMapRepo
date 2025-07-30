#!/usr/bin/env ts-node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertExpressToTRPC } from '../trpc-migration-step2';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function camelCase(name: string) {
  return name
    .split(/[-_]/)
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join('');
}

async function migrateAllRoutes() {
  const routesDir = path.join(__dirname, '..', 'server', 'src', 'routes');
  const routerIndex = path.join(__dirname, '..', 'server', 'src', 'trpc', 'routers', 'index.ts');

  const files = (await fs.readdir(routesDir)).filter((f) => f.endsWith('.ts'));

  for (const file of files) {
    const fullPath = path.join(routesDir, file);
    console.log(`Converting ${file}...`);
    await convertExpressToTRPC(fullPath);
  }

  let indexContent = await fs.readFile(routerIndex, 'utf8');

  for (const file of files) {
    const name = path.basename(file, '.ts');
    const camel = await camelCase(name);
    const importLine = `import { ${camel}Router } from './${name}.router';`;
    if (!indexContent.includes(importLine)) {
      indexContent = importLine + '\n' + indexContent;
    }
    const routerEntry = `  ${camel}: ${camel}Router,`;
    if (!indexContent.includes(routerEntry)) {
      indexContent = indexContent.replace('// Add other routers here', `${routerEntry}\n  // Add other routers here`);
    }
  }

  await fs.writeFile(routerIndex, indexContent);

  console.log(`Converted ${files.length} routes.`);
}

migrateAllRoutes().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
