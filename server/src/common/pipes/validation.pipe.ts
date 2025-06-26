import { type PipeTransform, Injectable, type BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Logger } from '@nestjs/common';

type Constructor<T = any> = new (...args: any[]) => T;

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  constructor(private readonly metatype?: Constructor) {}

  async transform(value: any, metadata: any) {
    if (!this.metatype || !this.toValidate(metadata.metatype || this.metatype)) {
      return value;
    }

    const object = plainToClass(metadata.metatype || this.metatype, value, {
      enableImplicitConversion: true,
    });

    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      validationError: { target: false },
    });

    if (errors.length > 0) {
      this.logger.warn(`Validation failed: ${JSON.stringify(this.flattenValidationErrors(errors))}`);
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: this.flattenValidationErrors(errors),
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private flattenValidationErrors(errors: any[]): Record<string, string[]> {
    return errors.reduce((acc, err) => {
      if (err.constraints) {
        acc[err.property] = Object.values(err.constraints);
      }
      if (err.children && err.children.length > 0) {
        acc[err.property] = this.flattenValidationErrors(err.children);
      }
      return acc;
    }, {});
  }
}

// Global validation pipe configuration
export const globalValidationPipeOptions = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  validationError: {
    target: false,
    value: false,
  },
};
