import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ICON_SIZES = [64, 128, 192, 512];
const SOURCE_ICON = path.join(__dirname, '../public/assets/icon/icon-512.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/assets/icon');
async function generateIcons() {
    console.log('Generating app icons...');
    try {
        // Create output directory if it doesn't exist
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        // Generate favicon
        await sharp(SOURCE_ICON)
            .resize(64, 64)
            .png()
            .toFile(path.join(OUTPUT_DIR, 'favicon.png'));
        console.log('Generated favicon.png');
        // Generate icons at various sizes
        for (const size of ICON_SIZES) {
            await sharp(SOURCE_ICON)
                .resize(size, size)
                .png()
                .toFile(path.join(OUTPUT_DIR, `icon-${size}.png`));
            console.log(`Generated icon-${size}.png`);
        }
        console.log('Icon generation complete!');
    }
    catch (error) {
        console.error('Error generating icons:', error);
    }
}
generateIcons();
