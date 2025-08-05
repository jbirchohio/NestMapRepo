import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Middleware to inject environment variables into index.html
 * Replaces %NONCE% and %MAPBOX_TOKEN% placeholders
 */
export function injectEnvVars(req: Request, res: Response, next: NextFunction) {
  // Only handle HTML requests
  if (!req.path.endsWith('.html') && req.path !== '/' && !req.accepts('html')) {
    return next();
  }

  const originalSend = res.send;
  res.send = function(data: any) {
    if (typeof data === 'string' && data.includes('<!DOCTYPE html>')) {
      // Generate a nonce for CSP
      const nonce = crypto.randomBytes(16).toString('base64');
      
      // Get Mapbox token from environment
      const mapboxToken = process.env.VITE_MAPBOX_TOKEN || '';
      
      // Replace placeholders
      data = data
        .replace(/%NONCE%/g, nonce)
        .replace(/%MAPBOX_TOKEN%/g, mapboxToken);
      
      // Set CSP header with nonce
      res.setHeader(
        'Content-Security-Policy',
        `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://apis.google.com https://emrldtp.com https://api.mapbox.com; ` +
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com; ` +
        `font-src 'self' https://fonts.gstatic.com;`
      );
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}