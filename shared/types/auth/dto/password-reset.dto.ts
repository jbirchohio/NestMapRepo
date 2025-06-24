import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { IsEmailValid, IsStrongPassword } from '../../validation/index.js';

export class RequestPasswordResetDto {
  @IsEmailValid()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  resetUrl?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  token?: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token!: string;

  @IsStrongPassword()
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  newPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'Please confirm your password' })
  confirmPassword!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword!: string;

  @IsStrongPassword()
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  newPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'Please confirm your new password' })
  confirmPassword!: string;
}
