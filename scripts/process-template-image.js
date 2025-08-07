import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processTemplateImage() {
  const uploadsDir = path.join(__dirname, '../uploads');
  const coversDir = path.join(__dirname, '../uploads/covers');
  const thumbsDir = path.join(__dirname, '../uploads/thumbnails');
  
  // Source image
  const sourceImage = path.join(uploadsDir, 'cover_template_remvana.png');
  
  try {
    // Check if source exists
    await fs.access(sourceImage);
    console.log('✓ Found source image:', sourceImage);
    
    // Ensure directories exist
    await fs.mkdir(coversDir, { recursive: true });
    await fs.mkdir(thumbsDir, { recursive: true });
    
    // Convert and optimize cover image (1200x630)
    const coverOutput = path.join(coversDir, 'cover_template_remvana.webp');
    await sharp(sourceImage)
      .resize(1200, 630, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(coverOutput);
    console.log('✓ Created cover image:', coverOutput);
    
    // Create thumbnail (400x300)
    const thumbOutput = path.join(thumbsDir, 'thumb_template_remvana.webp');
    await sharp(sourceImage)
      .resize(400, 300, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toFile(thumbOutput);
    console.log('✓ Created thumbnail:', thumbOutput);
    
    // Also keep a PNG version in covers for compatibility
    const coverPngOutput = path.join(coversDir, 'cover_template_remvana.png');
    await sharp(sourceImage)
      .resize(1200, 630, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true
      })
      .png({ quality: 90 })
      .toFile(coverPngOutput);
    console.log('✓ Created PNG cover:', coverPngOutput);
    
    console.log('\n✅ Image processing complete!');
    console.log('Cover URL: /uploads/covers/cover_template_remvana.webp');
    
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processTemplateImage();