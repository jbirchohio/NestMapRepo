const fs = require('fs');
const path = require('path');
// Directory to scan for components
const componentsDir = path.join(__dirname, 'client/src/components');
const fileExtensions = new Set(['.tsx', '.jsx']);
const findUnusedComponents = () => {
    if (!fs.existsSync(componentsDir)) {
        console.log('Components directory not found:', componentsDir);
        return [];
    }
    const componentFiles = fs.readdirSync(componentsDir, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && fileExtensions.has(path.extname(dirent.name)))
        .map(dirent => dirent.name);
    const usedComponents = new Set();
    // Recursively scan all source files
    const scanDirectory = (dir) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        files.forEach(dirent => {
            const fullPath = path.join(dir, dirent.name);
            if (dirent.isDirectory()) {
                scanDirectory(fullPath);
            }
            else if (fileExtensions.has(path.extname(dirent.name))) {
                try {
                    const fileContent = fs.readFileSync(fullPath, 'utf-8');
                    componentFiles.forEach(component => {
                        const componentName = path.basename(component, path.extname(component));
                        if (fileContent.includes(componentName) || fileContent.includes(component)) {
                            usedComponents.add(component);
                        }
                    });
                }
                catch (error) {
                    console.log(`Error reading file ${fullPath}:`, error.message);
                }
            }
        });
    };
    scanDirectory(path.join(__dirname, 'client/src'));
    const unusedComponents = componentFiles.filter(file => !usedComponents.has(file));
    return unusedComponents;
};
console.log('Scanning for unused components...');
const unusedComponents = findUnusedComponents();
console.log('Unused components:', unusedComponents);
console.log(`Found ${unusedComponents.length} potentially unused components out of ${fs.readdirSync(componentsDir).filter(file => fileExtensions.has(path.extname(file))).length} total components`);
