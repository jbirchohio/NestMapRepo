import { Router } from 'express';
import { requireAuth } from '../middleware/jwtAuth';
import { logger } from '../utils/logger';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// Ensure upload directories exist
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const COVERS_DIR = path.join(UPLOAD_DIR, 'covers');
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, 'thumbnails');

async function ensureDirectories() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(COVERS_DIR, { recursive: true });
    await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
  } catch (error) {
    logger.error('Error creating upload directories:', error);
  }
}

ensureDirectories();

// POST /api/upload/template-cover - Upload and optimize template cover image
router.post('/template-cover', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Generate unique filename
    const fileId = nanoid(10);
    const fileExt = '.webp'; // Always save as WebP for optimization
    const fileName = `cover_${fileId}${fileExt}`;
    const thumbnailName = `thumb_${fileId}${fileExt}`;

    // Process and optimize the main image
    await sharp(req.file.buffer)
      .resize(1200, 630, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(path.join(COVERS_DIR, fileName));

    // Create thumbnail for list views
    await sharp(req.file.buffer)
      .resize(400, 300, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toFile(path.join(THUMBNAILS_DIR, thumbnailName));

    // Get file info
    const coverStats = await fs.stat(path.join(COVERS_DIR, fileName));
    const thumbStats = await fs.stat(path.join(THUMBNAILS_DIR, thumbnailName));

    logger.info(`Template cover uploaded: ${fileName} (${coverStats.size} bytes)`);

    // Return URLs for accessing the images
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

    res.json({
      success: true,
      coverUrl: `${baseUrl}/uploads/covers/${fileName}`,
      thumbnailUrl: `${baseUrl}/uploads/thumbnails/${thumbnailName}`,
      fileId,
      originalName: req.file.originalname,
      coverSize: coverStats.size,
      thumbnailSize: thumbStats.size,
    });
  } catch (error) {
    logger.error('Error uploading template cover:', error);
    res.status(500).json({
      message: 'Failed to upload image',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/upload/template-cover/:fileId - Delete cover images
router.delete('/template-cover/:fileId', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Validate fileId format
    if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      return res.status(400).json({ message: 'Invalid file ID' });
    }

    const coverPath = path.join(COVERS_DIR, `cover_${fileId}.webp`);
    const thumbPath = path.join(THUMBNAILS_DIR, `thumb_${fileId}.webp`);

    // Delete files if they exist
    try {
      await fs.unlink(coverPath);
      await fs.unlink(thumbPath);
      logger.info(`Deleted template cover: ${fileId}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    res.json({ success: true, message: 'Images deleted' });
  } catch (error) {
    logger.error('Error deleting template cover:', error);
    res.status(500).json({ message: 'Failed to delete images' });
  }
});

export default router;