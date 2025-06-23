import { ValidationError } from '@/utils/errorHandler';
export class InputValidator {
    private static xssPatterns: RegExp[] = [
        /<script[^>]*>/gi,
        /<\s*script\s*>/gi,
        /<\s*iframe\s*>/gi,
        /javascript:/gi,
        /on\w+=/gi,
        /\balert\(/gi,
        /\bconfirm\(/gi,
        /\bprompt\(/gi
    ];
    private static sqlPatterns: RegExp[] = [
        /\b(SELECT|UPDATE|DELETE|INSERT|DROP|ALTER)\b/i,
        /\bFROM\b/i,
        /\bWHERE\b/i,
        /\bEXEC\b/i,
        /\bUNION\b/i,
        /\bSELECT\b/i,
        /\bDROP\b/i
    ];
    private static cmdPatterns: RegExp[] = [
        /\b(\|&|&|;|&&)\b/g,
        /\b(\$\(|\`)/g,
        /\b(\$\{)/g,
        /\b(\$\w+)/g,
        /\b(\$\$)/g
    ];
    private static filePatterns: RegExp[] = [
        /\b(\.\.\\|\.\.\/)/g,
        /\b(\.\.\\\.\\|\.\.\/\.)/g,
        /\b(\\\\|\/\/)/g,
        /\b(\\|\/)/g
    ];
    static validateString(input: string, options: {
        maxLength?: number;
        minLength?: number;
        pattern?: RegExp;
    } = {}): string {
        if (typeof input !== 'string') {
            throw new ValidationError('Input must be a string');
        }
        if (options.maxLength && input.length > options.maxLength) {
            throw new ValidationError(`Input exceeds maximum length of ${options.maxLength}`);
        }
        if (options.minLength && input.length < options.minLength) {
            throw new ValidationError(`Input is shorter than minimum length of ${options.minLength}`);
        }
        if (options.pattern && !options.pattern.test(input)) {
            throw new ValidationError('Input does not match required pattern');
        }
        return this.sanitizeString(input);
    }
    static validateEmail(email: string): string {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new ValidationError('Invalid email format');
        }
        return this.sanitizeString(email);
    }
    static validatePassword(password: string): string {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            throw new ValidationError('Password must contain at least 8 characters, including uppercase, lowercase, number, and special character');
        }
        return this.sanitizeString(password);
    }
    static validateUrl(url: string): string {
        const urlRegex = /^(https?:\/\/)?([\w.-]+(?:\/[\w.-]*)*\/?)$/;
        if (!urlRegex.test(url)) {
            throw new ValidationError('Invalid URL format');
        }
        return this.sanitizeString(url);
    }
    private static sanitizeString(input: string): string {
        let sanitized = input;
        this.xssPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        this.sqlPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        this.cmdPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        this.filePatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        sanitized = sanitized.replace(/&/g, '&amp;');
        sanitized = sanitized.replace(/</g, '&lt;');
        sanitized = sanitized.replace(/>/g, '&gt;');
        sanitized = sanitized.replace(/"/g, '&quot;');
        sanitized = sanitized.replace(/'/g, '&#039;');
        return sanitized;
    }
    static validateRequestData(data: any): any {
        if (typeof data === 'string') {
            return this.sanitizeString(data);
        }
        if (Array.isArray(data)) {
            return data.map(item => this.validateRequestData(item));
        }
        if (typeof data === 'object' && data !== null) {
            const result: {
                [key: string]: any;
            } = {};
            Object.entries(data).forEach(([key, value]) => {
                result[key] = this.validateRequestData(value);
            });
            return result;
        }
        return data;
    }
    static validateResponse(data: any): any {
        if (typeof data === 'string') {
            return this.sanitizeString(data);
        }
        if (Array.isArray(data)) {
            return data.map(item => this.validateResponse(item));
        }
        if (typeof data === 'object' && data !== null) {
            const result: {
                [key: string]: any;
            } = {};
            Object.entries(data).forEach(([key, value]) => {
                result[key] = this.validateResponse(value);
            });
            return result;
        }
        return data;
    }
}
