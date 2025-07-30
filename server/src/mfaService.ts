import { db } from './db-connection';
import { users } from './db/schema';
import { eq } from './utils/drizzle-shim';
import { auditLogger } from './auditLogger';
import crypto from 'crypto';

export interface MFAMethod {
  id: string;
  userId: number;
  type: 'totp' | 'sms' | 'email' | 'backup_codes';
  identifier: string; // phone number, email, or device name
  secret?: string; // for TOTP
  isEnabled: boolean;
  isPrimary: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export interface MFAChallenge {
  id: string;
  userId: string;
  methodId: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
  createdAt: Date;
}

export interface TOTPSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export class MFAService {
  private static instance: MFAService;
  private methods: Map<number, MFAMethod[]> = new Map();
  private challenges: Map<string, MFAChallenge> = new Map();

  static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  // Generate TOTP secret and QR code
  async setupTOTP(userId: number, appName: string = 'NestMap'): Promise<TOTPSetup> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) throw new Error('User not found');

    const secret = this.generateTOTPSecret();
    const userEmail = user[0].email;
    const qrCodeUrl = this.generateTOTPQRCode(secret, userEmail, appName);
    const backupCodes = this.generateBackupCodes();

    // Store the method (not enabled until verified)
    const method: MFAMethod = {
      id: `totp-${Date.now()}`,
      userId,
      type: 'totp',
      identifier: 'Authenticator App',
      secret,
      isEnabled: false,
      isPrimary: false,
      createdAt: new Date()
    };

    const userMethods = this.methods.get(userId) || [];
    userMethods.push(method);
    this.methods.set(userId, userMethods);

    // Store backup codes as a separate method
    const backupMethod: MFAMethod = {
      id: `backup-${Date.now()}`,
      userId,
      type: 'backup_codes',
      identifier: 'Backup Codes',
      secret: backupCodes.join(','),
      isEnabled: false,
      isPrimary: false,
      createdAt: new Date()
    };

    userMethods.push(backupMethod);
    this.methods.set(userId, userMethods);

    return { secret, qrCodeUrl, backupCodes };
  }

  // Verify TOTP code and enable the method
  async verifyTOTP(userId: number, code: string): Promise<boolean> {
    const userMethods = this.methods.get(userId) || [];
    const totpMethod = userMethods.find(m => m.type === 'totp' && !m.isEnabled);
    
    if (!totpMethod || !totpMethod.secret) return false;

    const isValid = this.verifyTOTPCode(totpMethod.secret, code);
    
    if (isValid) {
      totpMethod.isEnabled = true;
      totpMethod.isPrimary = true;
      totpMethod.lastUsed = new Date();

      // Enable backup codes too
      const backupMethod = userMethods.find(m => m.type === 'backup_codes' && !m.isEnabled);
      if (backupMethod) {
        backupMethod.isEnabled = true;
      }

      await auditLogger.log({
        userId,
        action: 'mfa_enabled',
        entityType: 'user',
        entityId: userId,
        details: { method: 'totp' }
      });

      return true;
    }

    return false;
  }

  // Setup SMS MFA
  async setupSMS(userId: number, phoneNumber: string): Promise<boolean> {
    const code = this.generateSMSCode();
    
    // In a real implementation, send SMS via Twilio or similar
    console.log(`SMS MFA code for ${phoneNumber}: ${code}`);

    const challenge: MFAChallenge = {
      id: `sms-${Date.now()}`,
      userId,
      methodId: `sms-${phoneNumber}`,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
      maxAttempts: 3,
      isUsed: false,
      createdAt: new Date()
    };

    this.challenges.set(challenge.id, challenge);

    // Store the method (not enabled until verified)
    const method: MFAMethod = {
      id: `sms-${Date.now()}`,
      userId,
      type: 'sms',
      identifier: phoneNumber,
      isEnabled: false,
      isPrimary: false,
      createdAt: new Date()
    };

    const userMethods = this.methods.get(userId) || [];
    userMethods.push(method);
    this.methods.set(userId, userMethods);

    return true;
  }

  // Verify SMS code
  async verifySMS(userId: number, challengeId: string, code: string): Promise<boolean> {
    const challenge = this.challenges.get(challengeId);
    
    if (!challenge || challenge.userId !== userId || challenge.isUsed) return false;
    if (challenge.expiresAt < new Date()) return false;
    if (challenge.attempts >= challenge.maxAttempts) return false;

    challenge.attempts++;

    if (challenge.code === code) {
      challenge.isUsed = true;
      
      // Enable the SMS method
      const userMethods = this.methods.get(userId) || [];
      const smsMethod = userMethods.find(m => m.type === 'sms' && !m.isEnabled);
      if (smsMethod) {
        smsMethod.isEnabled = true;
        smsMethod.isPrimary = userMethods.filter(m => m.isPrimary).length === 0;
        smsMethod.lastUsed = new Date();
      }

      await auditLogger.log({
        userId,
        action: 'mfa_enabled',
        entityType: 'user',
        entityId: userId,
        details: { method: 'sms' }
      });

      return true;
    }

    return false;
  }

  // Create MFA challenge for login
  async createLoginChallenge(userId: number): Promise<{ challengeId: string; methods: MFAMethod[] }> {
    const userMethods = this.methods.get(userId) || [];
    const enabledMethods = userMethods.filter(m => m.isEnabled);

    if (enabledMethods.length === 0) {
      throw new Error('No MFA methods enabled for user');
    }

    const primaryMethod = enabledMethods.find(m => m.isPrimary) || enabledMethods[0];
    let challengeId = '';

    if (primaryMethod.type === 'totp') {
      challengeId = `totp-challenge-${Date.now()}`;
      const challenge: MFAChallenge = {
        id: challengeId,
        userId,
        methodId: primaryMethod.id,
        code: '', // TOTP doesn't need a generated code
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        attempts: 0,
        maxAttempts: 3,
        isUsed: false,
        createdAt: new Date()
      };
      this.challenges.set(challengeId, challenge);
    } else if (primaryMethod.type === 'sms') {
      const code = this.generateSMSCode();
      challengeId = `sms-challenge-${Date.now()}`;
      
      // Send SMS
      console.log(`SMS MFA code for ${primaryMethod.identifier}: ${code}`);
      
      const challenge: MFAChallenge = {
        id: challengeId,
        userId,
        methodId: primaryMethod.id,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
        maxAttempts: 3,
        isUsed: false,
        createdAt: new Date()
      };
      this.challenges.set(challengeId, challenge);
    }

    return { challengeId, methods: enabledMethods };
  }

  // Verify MFA challenge during login
  async verifyLoginChallenge(challengeId: string, code: string): Promise<boolean> {
    const challenge = this.challenges.get(challengeId);
    
    if (!challenge || challenge.isUsed) return false;
    if (challenge.expiresAt < new Date()) return false;
    if (challenge.attempts >= challenge.maxAttempts) return false;

    challenge.attempts++;

    const userMethods = this.methods.get(challenge.userId) || [];
    const method = userMethods.find(m => m.id === challenge.methodId);
    
    if (!method) return false;

    let isValid = false;

    if (method.type === 'totp' && method.secret) {
      isValid = this.verifyTOTPCode(method.secret, code);
    } else if (method.type === 'sms') {
      isValid = challenge.code === code;
    } else if (method.type === 'backup_codes' && method.secret) {
      const backupCodes = method.secret.split(',');
      isValid = backupCodes.includes(code);
      
      if (isValid) {
        // Remove used backup code
        const remainingCodes = backupCodes.filter(c => c !== code);
        method.secret = remainingCodes.join(',');
      }
    }

    if (isValid) {
      challenge.isUsed = true;
      method.lastUsed = new Date();

      await auditLogger.log({
        userId: challenge.userId,
        action: 'mfa_verified',
        entityType: 'user',
        entityId: challenge.userId,
        details: { method: method.type, challengeId }
      });

      return true;
    }

    return false;
  }

  // Get user's MFA methods
  async getUserMethods(userId: number): Promise<MFAMethod[]> {
    return this.methods.get(userId) || [];
  }

  // Disable MFA method
  async disableMethod(userId: number, methodId: string): Promise<boolean> {
    const userMethods = this.methods.get(userId) || [];
    const method = userMethods.find(m => m.id === methodId);
    
    if (!method) return false;

    method.isEnabled = false;
    
    await auditLogger.log({
      userId,
      action: 'mfa_disabled',
      entityType: 'user',
      entityId: userId,
      details: { method: method.type, methodId }
    });

    return true;
  }

  // Check if user has MFA enabled
  async hasMFAEnabled(userId: number): Promise<boolean> {
    const userMethods = this.methods.get(userId) || [];
    return userMethods.some(m => m.isEnabled);
  }

  // Private helper methods
  private generateTOTPSecret(): string {
    return crypto.randomBytes(20).toString('base32');
  }

  private generateTOTPQRCode(secret: string, email: string, appName: string): string {
    const otpauth = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private verifyTOTPCode(secret: string, code: string): boolean {
    // In a real implementation, use a proper TOTP library like 'otplib'
    // This is a simplified version for demonstration
    const timeStep = Math.floor(Date.now() / 30000);
    const expectedCode = this.generateTOTPCode(secret, timeStep);
    const previousCode = this.generateTOTPCode(secret, timeStep - 1);
    
    return code === expectedCode || code === previousCode;
  }

  private generateTOTPCode(secret: string, timeStep: number): string {
    // Simplified TOTP implementation - use a proper library in production
    const secretBuffer = Buffer.from(secret, 'base64');
    const hash = crypto.createHmac('sha1', secretBuffer);
    hash.update(Buffer.from(timeStep.toString(16).padStart(16, '0'), 'hex'));
    const hmac = hash.digest();
    
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
    
    return code.toString().padStart(6, '0');
  }
}

export const mfaService = MFAService.getInstance();
