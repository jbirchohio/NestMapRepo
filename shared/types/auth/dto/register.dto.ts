import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches, IsOptional, ValidateIf } from 'class-validator';
import { IsEmailValid, IsStrongPassword } from '../../validation/index.js';
import { UserRole } from '../permissions.js';

export class RegisterDto {
  @IsEmailValid()
  @IsNotEmpty({ message: 'Email is required' })
  @IsString()
  @MaxLength(50)
  email!: string;

  @IsStrongPassword()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(50)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  @ValidateIf(o => o.role)
  organizationId?: string;

  @IsOptional()
  role?: UserRole = UserRole.MEMBER;

  @IsOptional()
  acceptTerms?: boolean;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}
