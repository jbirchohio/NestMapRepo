import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { UserRole } from '../auth/permissions';

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
    return Object.values(UserRole).includes(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be one of: ${Object.values(UserRole).join(', ')}`;
  }
}

/**
 * Validates if the value is a strong password
 * Meets enterprise security requirements
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPassword implements ValidatorConstraintInterface {
  validate(password: string) {
    // At least 12 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])(?=.{12,})/;
    return strongRegex.test(password);
  }

  defaultMessage() {
    return 'Password must be at least 12 characters long and include uppercase, lowercase, number, and special character';
  }
}
