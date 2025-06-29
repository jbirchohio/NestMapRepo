
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const main = async () => {
  const files = await glob('client/src/**/*.{ts,tsx}');
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('../../shared/dist/')) {
      const newContent = content.replace(/..\/..\/shared\/dist\//g, '@shared/');
      fs.writeFileSync(file, newContent, 'utf-8');
    }
  }
};

main();
