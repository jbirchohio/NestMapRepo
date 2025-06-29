
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const main = async () => {
  const files = await glob('client/src/**/*.{ts,tsx}');
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('@shared/')) {
      const newContent = content.replace(/@shared\//g, '../../shared/dist/');
      fs.writeFileSync(file, newContent, 'utf-8');
    }
  }
};

main();
