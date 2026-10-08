import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { z, ZodSchema } from 'zod';

export class ZodValidationException extends BadRequestException {
  validation: z.ZodError;

  constructor(zodError: z.ZodError) {
    super();
    this.message = 'Validation failed';
    this.validation = zodError;
  }

  override getResponse(): string | object {
    const baseResponse = super.getResponse() as object;
    const { issues } = this.validation;
    return {
      ...baseResponse,
      issues,
    };
  }
}

@Injectable()
export class ZodValidation implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: Record<string, object | string | number | boolean>) {
    const parseResult = this.schema.safeParse(value);
    if (!parseResult.success) {
      throw new ZodValidationException(parseResult.error);
    }
    return parseResult.data;
  }
}
