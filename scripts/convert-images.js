import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertImagesToWebP() {
  const coversDir = path.join(__dirname, '../uploads/covers');
  const thumbsDir = path.join(__dirname, '../uploads/thumbnails');
  
  // Ensure directories exist
  await fs.mkdir(coversDir, { recursive: true });
  await fs.mkdir(thumbsDir, { recursive: true });
  
  // Get all image files
  const files = await fs.readdir(coversDir);
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png)$/i.test(file) && 
    !file.startsWith('.')
  );
  
  console.log(`Found ${imageFiles.length} images to convert`);
  
  for (const file of imageFiles) {
    const inputPath = path.join(coversDir, file);
    const baseName = path.basename(file, path.extname(file));
    const coverOutput = path.join(coversDir, `${baseName}.webp`);
    const thumbOutput = path.join(thumbsDir, `thumb_${baseName.replace('cover_', '')}.webp`);
    
    try {
      // Convert and optimize cover image
      await sharp(inputPath)
        .resize(1200, 630, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toFile(coverOutput);
      
      // Create thumbnail
      await sharp(inputPath)
        .resize(400, 300, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 80 })
        .toFile(thumbOutput);
      
      console.log(`✓ Converted ${file} to WebP`);
      
      // Optional: Delete original file after conversion
      // await fs.unlink(inputPath);
      
    } catch (error) {
      console.error(`✗ Failed to convert ${file}:`, error.message);
    }
  }
  
  console.log('Conversion complete!');
}

// Run the conversion
convertImagesToWebP().catch(console.error);