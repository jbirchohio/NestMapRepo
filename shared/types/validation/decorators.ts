import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { UserRole } from '../auth/permissions.js';

/**
 * Validates that the field is a valid tenant ID
 * Ensures proper tenant isolation in multi-tenant environment
 */
export function IsTenantId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTenantId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value) return false;
          return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid tenant ID`;
        },
      },
    });
  };
}

/**
 * Validates that the field is a valid user role
 * Ensures only defined roles from UserRole enum are used
 */
export function IsValidRole(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidRole',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          const validRoles = Object.values(UserRole) as string[];
          return validRoles.includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          const validRoles = Object.values(UserRole).filter(v => typeof v === 'string') as string[];
          return `${args.property} must be one of: ${validRoles.join(', ')}`;
        },
      },
    });
  };
}

/**
 * Validates that the field is a strong password
 * Meets enterprise security requirements
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(password: string) {
          // At least 12 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
          const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])(?=.{12,})/;
          return strongRegex.test(password);
        },
        defaultMessage() {
          return 'Password must be at least 12 characters long and include uppercase, lowercase, number, and special character';
        },
      },
    });
  };
}

/**
 * Validates that the field is a valid email address
 * Includes basic format validation
 */
export function IsEmailValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEmailValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(email: string) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid email address`;
        },
      },
    });
  };
}
