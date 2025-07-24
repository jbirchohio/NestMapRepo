// Unit tests for the automated transformation system
import { describe, it, expect } from 'vitest';
import { autoTransform } from '../autoTransform';
import { validateTransformationResult } from '../validators';

describe('autoTransform', () => {
  describe('camelCase to snake_case conversion', () => {
    it('should convert simple camelCase properties', () => {
      const input = { firstName: 'John', lastName: 'Doe' };
      const result = autoTransform(input, 'camelToSnake');
      
      expect(result).toEqual({
        first_name: 'John',
        last_name: 'Doe'
      });
    });

    it('should handle nested objects', () => {
      const input = {
        personalInfo: {
          firstName: 'John',
          phoneNumber: '123-456-7890'
        },
        addressInfo: {
          streetAddress: '123 Main St',
          zipCode: '12345'
        }
      };
      
      const result = autoTransform(input, 'camelToSnake');
      
      expect(result).toEqual({
        personal_info: {
          first_name: 'John',
          phone_number: '123-456-7890'
        },
        address_info: {
          street_address: '123 Main St',
          zip_code: '12345'
        }
      });
    });

    it('should handle arrays of objects', () => {
      const input = {
        userList: [
          { firstName: 'John', isActive: true },
          { firstName: 'Jane', isActive: false }
        ]
      };
      
      const result = autoTransform(input, 'camelToSnake');
      
      expect(result).toEqual({
        user_list: [
          { first_name: 'John', is_active: true },
          { first_name: 'Jane', is_active: false }
        ]
      });
    });

    it('should preserve non-object values', () => {
      const input = {
        userName: 'john_doe',
        isActive: true,
        userId: 123,
        metadata: null,
        tags: ['tag1', 'tag2']
      };
      
      const result = autoTransform(input, 'camelToSnake');
      
      expect(result).toEqual({
        user_name: 'john_doe',
        is_active: true,
        user_id: 123,
        metadata: null,
        tags: ['tag1', 'tag2']
      });
    });
  });

  describe('snake_case to camelCase conversion', () => {
    it('should convert simple snake_case properties', () => {
      const input = { first_name: 'John', last_name: 'Doe' };
      const result = autoTransform(input, 'snakeToCamel');
      
      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe'
      });
    });

    it('should handle complex nested structures', () => {
      const input = {
        user_profile: {
          personal_info: {
            first_name: 'John',
            date_of_birth: '1990-01-01'
          },
          account_settings: {
            email_notifications: true,
            privacy_level: 'high'
          }
        }
      };
      
      const result = autoTransform(input, 'snakeToCamel');
      
      expect(result).toEqual({
        userProfile: {
          personalInfo: {
            firstName: 'John',
            dateOfBirth: '1990-01-01'
          },
          accountSettings: {
            emailNotifications: true,
            privacyLevel: 'high'
          }
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle null input gracefully', () => {
      const result = autoTransform(null, 'camelToSnake');
      expect(result).toBeNull();
    });

    it('should handle undefined input gracefully', () => {
      const result = autoTransform(undefined, 'camelToSnake');
      expect(result).toBeUndefined();
    });

    it('should handle circular references', () => {
      const obj: any = { name: 'test' };
      obj.self = obj; // Create circular reference
      
      // Should not throw an error
      expect(() => autoTransform(obj, 'camelToSnake')).not.toThrow();
    });

    it('should throw error for invalid transformation type', () => {
      expect(() => autoTransform({}, 'invalidType' as any)).toThrow();
    });
  });

  describe('performance considerations', () => {
    it('should handle large objects efficiently', () => {
      const largeObject = {};
      for (let i = 0; i < 1000; i++) {
        (largeObject as any)[`property${i}`] = `value${i}`;
      }
      
      const start = Date.now();
      const result = autoTransform(largeObject, 'camelToSnake');
      const end = Date.now();
      
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
      expect(Object.keys(result)).toHaveLength(1000);
    });
  });
});

describe('validateTransformationResult', () => {
  it('should validate successful transformation', () => {
    const original = { firstName: 'John', lastName: 'Doe' };
    const transformed = { first_name: 'John', last_name: 'Doe' };
    
    const validation = validateTransformationResult(original, transformed, 'camelToSnake');
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.warnings).toHaveLength(0);
  });

  it('should detect missing properties', () => {
    const original = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
    const transformed = { first_name: 'John', last_name: 'Doe' };
    
    const validation = validateTransformationResult(original, transformed, 'camelToSnake');
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Missing property: email -> email');
  });

  it('should detect value mismatches', () => {
    const original = { firstName: 'John', age: 30 };
    const transformed = { first_name: 'Jane', age: 30 };
    
    const validation = validateTransformationResult(original, transformed, 'camelToSnake');
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Value mismatch for first_name: expected "John", got "Jane"');
  });

  it('should handle type mismatches', () => {
    const original = { isActive: true, count: 5 };
    const transformed = { is_active: 'true', count: '5' };
    
    const validation = validateTransformationResult(original, transformed, 'camelToSnake');
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Type mismatch for is_active: expected boolean, got string');
    expect(validation.errors).toContain('Type mismatch for count: expected number, got string');
  });

  it('should provide warnings for potential issues', () => {
    const original = { 
      specialChars: 'test$value',
      __private: 'hidden',
      CONSTANT: 'value'
    };
    const transformed = { 
      special_chars: 'test$value',
      __private: 'hidden',
      c_o_n_s_t_a_n_t: 'value'
    };
    
    const validation = validateTransformationResult(original, transformed, 'camelToSnake');
    
    expect(validation.warnings.length).toBeGreaterThan(0);
    expect(validation.warnings.some(w => w.includes('special characters'))).toBe(true);
  });
});
