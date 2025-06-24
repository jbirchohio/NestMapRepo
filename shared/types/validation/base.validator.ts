import { ValidatorConstraint } from 'class-validator';
import type { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';
import { UserRole } from '../auth/permissions.js';

// Define valid user roles as a constant array
const VALID_USER_ROLES = Object.values(UserRole);

/**
 * Validates if the value is a valid tenant ID
 * Ensures proper tenant isolation in multi-tenant environment
 */
@ValidatorConstraint({ name: 'isValidTenantId', async: false })
export class IsValidTenantId implements ValidatorConstraintInterface {
  validate(value: string) {
    if (!value) return false;
    // Basic UUID validation - can be enhanced with tenant existence check
    return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid tenant ID`;
  }
}

/**
 * Validates if the value is a valid user role
 * Ensures only defined roles are used
 */
@ValidatorConstraint({ name: 'isValidUserRole', async: false })
export class IsValidUserRole implements ValidatorConstraintInterface {
  validate(value: any) {
    return VALID_USER_ROLES.includes(value as UserRole);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be one of: ${VALID_USER_ROLES.join(', ')}`;
  }
}

// IsStrongPassword has been moved to decorators.ts to avoid duplicate exports
