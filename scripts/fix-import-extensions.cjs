const fs = require('fs');
const { glob } = require('glob');

(async () => {
  const files = await glob('server/**/*.ts');
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const updated = content
      .replace(/from\s+(['"])(\.\.?(?:\/[^'"\n]+)+?)\.ts\1/g, (m, q, p) => `from ${q}${p}.js${q}`)
      .replace(/import\(\s*(['"])(\.\.?(?:\/[^'"\n]+)+?)\.ts\1\s*\)/g, (m, q, p) => `import(${q}${p}.js${q})`)
      .replace(/require\(\s*(['"])(\.\.?(?:\/[^'"\n]+)+?)\.ts\1\s*\)/g, (m, q, p) => `require(${q}${p}.js${q})`);
    if (content !== updated) {
      fs.writeFileSync(file, updated, 'utf8');
    }
  }
})();
