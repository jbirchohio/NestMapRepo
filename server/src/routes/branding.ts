/**
 * White Label Branding Routes
 * Handles dynamic organization-specific theming and branding
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/secureAuth';
import { validateRequest } from '../middleware/input-validation';
import { whiteLabelService, WhiteLabelTheme } from '../services/whiteLabelService';
import { logger } from '../utils/logger.js';

const router = Router();

// Apply authentication to all branding routes
router.use(authenticate);

// Validation schemas
const updateThemeSchema = z.object({
  enabled: z.boolean().optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  linkColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  buttonColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  buttonTextColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  headerBackgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  headerTextColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  sidebarBackgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  sidebarTextColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  footerBackgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  footerTextColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  customCss: z.string().max(10000, 'Custom CSS too long').optional(),
  customJs: z.string().max(10000, 'Custom JS too long').optional(),
  favicon: z.string().url().optional(),
  companyName: z.string().max(255).optional(),
  companyTagline: z.string().max(255).optional(),
  contactEmail: z.string().email().optional(),
  supportUrl: z.string().url().optional(),
  privacyPolicyUrl: z.string().url().optional(),
  termsOfServiceUrl: z.string().url().optional(),
  socialLinks: z.object({
    twitter: z.string().url().optional(),
    facebook: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    instagram: z.string().url().optional()
  }).optional()
});

/**
 * GET /api/branding/theme
 * Get organization's current theme
 */
router.get('/theme', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization context required'
      });
    }

    const theme = await whiteLabelService.getOrganizationTheme(user.organizationId);

    res.json({
      success: true,
      data: theme
    });
  } catch (error) {
    logger.error('Error fetching organization theme:', error);
    next(error);
  }
});

/**
 * PUT /api/branding/theme
 * Update organization's theme
 */
router.put('/theme', validateRequest(updateThemeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization context required'
      });
    }

    // Check if user has permission to update branding
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const themeUpdate = req.body;
    const updatedTheme = await whiteLabelService.updateOrganizationTheme(
      user.organizationId, 
      themeUpdate
    );

    res.json({
      success: true,
      data: updatedTheme
    });
  } catch (error) {
    logger.error('Error updating organization theme:', error);
    next(error);
  }
});

/**
 * GET /api/branding/css
 * Get organization's theme CSS
 */
router.get('/css', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization context required'
      });
    }

    const css = await whiteLabelService.generateThemeCSS(user.organizationId);

    res.setHeader('Content-Type', 'text/css');
    res.send(css);
  } catch (error) {
    logger.error('Error generating theme CSS:', error);
    next(error);
  }
});

/**
 * GET /api/branding/assets
 * Get organization's branding assets
 */
router.get('/assets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization context required'
      });
    }

    const assets = await whiteLabelService.generateBrandingAssets(user.organizationId);

    res.json({
      success: true,
      data: assets
    });
  } catch (error) {
    logger.error('Error fetching branding assets:', error);
    next(error);
  }
});

/**
 * POST /api/branding/preview
 * Preview theme changes without saving
 */
router.post('/preview', validateRequest(updateThemeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization context required'
      });
    }

    const themePreview = req.body;
    const currentTheme = await whiteLabelService.getOrganizationTheme(user.organizationId);
    
    // Merge current theme with preview changes
    const previewTheme: WhiteLabelTheme = {
      ...currentTheme,
      ...themePreview
    };

    // Generate preview CSS
    const previewCss = await whiteLabelService.generateThemeCSS(user.organizationId);

    res.json({
      success: true,
      data: {
        theme: previewTheme,
        css: previewCss
      }
    });
  } catch (error) {
    logger.error('Error generating theme preview:', error);
    next(error);
  }
});

/**
 * DELETE /api/branding/cache
 * Clear organization's branding cache (admin only)
 */
router.delete('/cache', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization context required'
      });
    }

    // Check if user has permission to clear cache
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    whiteLabelService.clearCache(user.organizationId);

    res.json({
      success: true,
      message: 'Branding cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing branding cache:', error);
    next(error);
  }
});

/**
 * GET /api/branding/public/:organizationId/theme
 * Get public theme for organization (for embedding)
 */
router.get('/public/:organizationId/theme', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    const theme = await whiteLabelService.getOrganizationTheme(organizationId);

    // Only return public theme data (no sensitive information)
    const publicTheme = {
      enabled: theme.enabled,
      logoUrl: theme.logoUrl,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor,
      linkColor: theme.linkColor,
      companyName: theme.companyName,
      companyTagline: theme.companyTagline,
      favicon: theme.favicon
    };

    res.json({
      success: true,
      data: publicTheme
    });
  } catch (error) {
    logger.error('Error fetching public theme:', error);
    next(error);
  }
});

/**
 * GET /api/branding/public/:organizationId/css
 * Get public CSS for organization (for embedding)
 */
router.get('/public/:organizationId/css', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    const css = await whiteLabelService.generateThemeCSS(organizationId);

    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(css);
  } catch (error) {
    logger.error('Error generating public CSS:', error);
    next(error);
  }
});

export default router;

