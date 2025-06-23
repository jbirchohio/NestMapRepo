import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { IsEmailValid, IsStrongPassword } from '../../validation';
import { UserRole } from '../permissions';

export class RegisterDto {
  @IsEmailValid()
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsStrongPassword()
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  @ValidateIf(o => o.role)
  organizationId?: string;

  @IsOptional()
  role?: UserRole = UserRole.USER;

  @IsOptional()
  acceptTerms?: boolean;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}
