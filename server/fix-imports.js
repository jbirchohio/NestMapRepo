const fs = require('fs');
const path = require('path');

// Function to process a file
function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;
        
        // Replace the import path
        const updatedContent = content.replace(
            /from\s+['"]\.\.\/express-augmentations(?:.ts)?['"]/g,
            "from './express-augmentations.js'"
        );
        
        if (updatedContent !== content) {
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`Updated imports in: ${filePath}`);
            return true;
        }
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
    return false;
}

// Function to process all TypeScript files in a directory
function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    let count = 0;
    
    files.forEach(file => {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Skip node_modules and other non-source directories
            if (!['node_modules', 'dist', '.git', '.next', 'build'].includes(file)) {
                count += processDirectory(fullPath);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            if (processFile(fullPath)) {
                count++;
            }
        }
    });
    
    return count;
}

// Start processing from the server directory
const serverDir = path.join(__dirname, 'server');
const filesUpdated = processDirectory(serverDir);

console.log(`\nUpdated ${filesUpdated} files.`);
