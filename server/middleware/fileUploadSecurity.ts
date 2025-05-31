import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs/promises';

interface FileValidationConfig {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  scanForMalware: boolean;
  quarantinePath?: string;
}

interface SecurityScanResult {
  safe: boolean;
  threats: string[];
  fileHash: string;
  scanTimestamp: Date;
  scannerUsed: string;
  scanDuration: number;
}

interface VirusScanEngine {
  name: string;
  command: string;
  args: string[];
  threatPatterns: RegExp[];
  installed: boolean;
}

/**
 * Available virus scanning engines
 */
const VIRUS_SCAN_ENGINES: VirusScanEngine[] = [
  {
    name: 'ClamAV',
    command: 'clamscan',
    args: ['--no-summary', '--infected'],
    threatPatterns: [/FOUND$/, /Infected files: [1-9]/],
    installed: false
  },
  {
    name: 'Windows Defender',
    command: 'powershell',
    args: ['-Command', 'Get-MpThreatDetection'],
    threatPatterns: [/ThreatName/],
    installed: process.platform === 'win32'
  },
  {
    name: 'VirusTotal API',
    command: 'curl',
    args: ['-X', 'POST'],
    threatPatterns: [/"positives":\s*[1-9]/],
    installed: !!process.env.VIRUSTOTAL_API_KEY
  }
];

/**
 * Enhanced file validation with virus scanning
 */
async function scanFileForViruses(filePath: string): Promise<VirusScanResult> {
  const startTime = Date.now();
  
  for (const engine of VIRUS_SCAN_ENGINES) {
    if (!engine.installed) continue;
    
    try {
      const result = await runVirusScan(engine, filePath);
      if (result) {
        return {
          isClean: !result.threatFound,
          threatFound: result.threatFound,
          scannerUsed: engine.name,
          scanTime: Date.now() - startTime
        };
      }
    } catch (error) {
      console.warn(`Virus scan failed with ${engine.name}:`, error);
      continue;
    }
  }
  
  // Fallback to basic pattern detection if no engines available
  return await performBasicThreatDetection(filePath, startTime);
}

/**
 * Run virus scan with specific engine
 */
async function runVirusScan(engine: VirusScanEngine, filePath: string): Promise<{threatFound?: string} | null> {
  return new Promise((resolve) => {
    const process = spawn(engine.command, [...engine.args, filePath]);
    let output = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      const threatFound = engine.threatPatterns.some(pattern => pattern.test(output));
      resolve(threatFound ? { threatFound: output.trim() } : { threatFound: undefined });
    });
    
    process.on('error', () => {
      resolve(null);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      process.kill();
      resolve(null);
    }, 30000);
  });
}

/**
 * Basic threat detection using file patterns
 */
async function performBasicThreatDetection(filePath: string, startTime: number): Promise<VirusScanResult> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const suspiciousPatterns = [
      /eval\s*\(/gi,
      /document\.write/gi,
      /\.exe\s*$/gi,
      /CreateObject/gi,
      /WScript\.Shell/gi,
      /<script[^>]*>.*?<\/script>/gi
    ];
    
    const fileContent = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 1024 * 1024)); // First 1MB
    const threatsFound = suspiciousPatterns.filter(pattern => pattern.test(fileContent));
    
    return {
      isClean: threatsFound.length === 0,
      threatFound: threatsFound.length > 0 ? `Suspicious patterns detected: ${threatsFound.length}` : undefined,
      scannerUsed: 'Basic Pattern Detection',
      scanTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      isClean: false,
      threatFound: 'File read error during scan',
      scannerUsed: 'Error Handler',
      scanTime: Date.now() - startTime
    };
  }
}

const DEFAULT_CONFIG: FileValidationConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/json'
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.json'],
  scanForMalware: true
};

/**
 * Enhanced file upload security middleware with validation and threat detection
 */
export function createFileUploadSecurityMiddleware(config: Partial<FileValidationConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next();
      }

      const file = req.file;
      const securityResult = await validateFileUpload(file, finalConfig, req);
      
      if (!securityResult.safe) {
        // Log security violation
        console.warn(`File upload security violation:`, {
          userId: req.user?.id,
          organizationId: req.user?.organizationId,
          filename: file.originalname,
          threats: securityResult.threats,
          timestamp: new Date().toISOString()
        });

        return res.status(400).json({
          error: 'File upload rejected for security reasons',
          reasons: securityResult.threats
        });
      }

      // Add security metadata to request
      (req as any).fileSecurityScan = securityResult;
      
      next();
    } catch (error) {
      console.error('File security middleware error:', error);
      res.status(500).json({ error: 'File security validation failed' });
    }
  };
}

/**
 * Comprehensive file validation with security scanning
 */
async function validateFileUpload(
  file: Express.Multer.File, 
  config: FileValidationConfig,
  req: Request
): Promise<SecurityScanResult> {
  const threats: string[] = [];
  const fileHash = generateFileHash(file.buffer);
  
  // Size validation
  if (file.size > config.maxSize) {
    threats.push(`File size ${file.size} exceeds maximum allowed ${config.maxSize}`);
  }

  // MIME type validation
  if (!config.allowedTypes.includes(file.mimetype)) {
    threats.push(`MIME type ${file.mimetype} not allowed`);
  }

  // Extension validation
  const ext = path.extname(file.originalname).toLowerCase();
  if (!config.allowedExtensions.includes(ext)) {
    threats.push(`File extension ${ext} not allowed`);
  }

  // Filename security validation
  const filenameThreats = validateFilename(file.originalname);
  threats.push(...filenameThreats);

  // Content-based validation
  const contentThreats = await validateFileContent(file.buffer, file.mimetype);
  threats.push(...contentThreats);

  // Organization-specific file restrictions
  if (req.user?.organizationId) {
    const orgThreats = await validateOrganizationRestrictions(file, req.user.organizationId);
    threats.push(...orgThreats);
  }

  // Malware scanning (if enabled)
  if (config.scanForMalware) {
    const malwareThreats = await scanForMalware(file.buffer, fileHash);
    threats.push(...malwareThreats);
  }

  return {
    safe: threats.length === 0,
    threats,
    fileHash,
    scanTimestamp: new Date()
  };
}

/**
 * Validate filename for security issues
 */
function validateFilename(filename: string): string[] {
  const threats: string[] = [];
  
  // Check for directory traversal
  if (filename.includes('../') || filename.includes('..\\')) {
    threats.push('Directory traversal detected in filename');
  }

  // Check for null bytes
  if (filename.includes('\0')) {
    threats.push('Null byte detected in filename');
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.pif$/i,
    /\.com$/i,
    /\.vbs$/i,
    /\.js$/i,
    /\.jar$/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filename)) {
      threats.push(`Suspicious file extension detected: ${filename}`);
      break;
    }
  }

  // Check filename length
  if (filename.length > 255) {
    threats.push('Filename too long');
  }

  return threats;
}

/**
 * Validate file content for security threats
 */
async function validateFileContent(buffer: Buffer, mimetype: string): Promise<string[] {
  const threats: string[] = [];
  
  // Check for embedded scripts in images
  if (mimetype.startsWith('image/')) {
    const content = buffer.toString('ascii', 0, Math.min(1024, buffer.length));
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        threats.push('Embedded script detected in image file');
        break;
      }
    }
  }

  // Check for PHP code in uploads
  if (buffer.toString('ascii', 0, Math.min(1024, buffer.length)).includes('<?php')) {
    threats.push('PHP code detected in uploaded file');
  }

  // Check for suspicious magic bytes
  const magicBytes = buffer.subarray(0, 8);
  const suspiciousMagic = [
    Buffer.from([0x4D, 0x5A]), // PE executable
    Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
  ];

  for (const suspicious of suspiciousMagic) {
    if (magicBytes.subarray(0, suspicious.length).equals(suspicious)) {
      threats.push('Executable file detected');
      break;
    }
  }

  return threats;
}

/**
 * Check organization-specific file restrictions
 */
async function validateOrganizationRestrictions(
  file: Express.Multer.File, 
  organizationId: number
): Promise<string[]> {
  const threats: string[] = [];
  
  // Organization quota checking could be implemented here
  // For now, basic validation
  
  if (file.size > 50 * 1024 * 1024) { // 50MB org limit
    threats.push('File exceeds organization size limit');
  }

  return threats;
}

/**
 * Basic malware scanning using pattern detection
 */
async function scanForMalware(buffer: Buffer, fileHash: string): Promise<string[]> {
  const threats: string[] = [];
  
  // Check against known malicious patterns
  const maliciousPatterns = [
    /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*/,
    /cmd\.exe/i,
    /powershell/i,
    /eval\(/i,
    /base64_decode/i
  ];

  const content = buffer.toString('ascii', 0, Math.min(8192, buffer.length));
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(content)) {
      threats.push('Malicious pattern detected in file content');
      break;
    }
  }

  // Hash-based detection (would integrate with threat intelligence)
  const knownMaliciousHashes = new Set([
    // EICAR test hash
    '3395856ce81f2b7382dee72602f798b642f14140'
  ]);

  if (knownMaliciousHashes.has(fileHash)) {
    threats.push('File matches known malicious hash');
  }

  return threats;
}

/**
 * Generate SHA-1 hash of file content
 */
function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

/**
 * File upload audit logging
 */
export function logFileUpload(
  req: Request,
  file: Express.Multer.File,
  scanResult: SecurityScanResult
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: req.user?.id,
    organizationId: req.user?.organizationId,
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    fileHash: scanResult.fileHash,
    securityStatus: scanResult.safe ? 'SAFE' : 'BLOCKED',
    threats: scanResult.threats,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  console.log('File upload audit:', JSON.stringify(logEntry));
  
  // In production, this would be sent to a security monitoring system
}

export { FileValidationConfig, SecurityScanResult };