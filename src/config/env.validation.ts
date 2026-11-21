import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @IsOptional()
  PORT?: number;

  @IsString()
  DB_HOST: string;

  @IsInt()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsIn(['local', 's3'], { message: 'STORAGE_DRIVER must be "local" or "s3"' })
  @IsOptional()
  STORAGE_DRIVER?: string;

  @ValidateIf((env: EnvironmentVariables) => env.STORAGE_DRIVER === 's3')
  @IsNotEmpty({ message: 'S3_BUCKET is required when STORAGE_DRIVER=s3' })
  S3_BUCKET?: string;

  @ValidateIf((env: EnvironmentVariables) => env.STORAGE_DRIVER === 's3' && !!env.S3_ENDPOINT)
  @IsUrl({ require_tld: false }, { message: 'S3_ENDPOINT must be a URL' })
  S3_ENDPOINT?: string;

  @ValidateIf((env: EnvironmentVariables) => env.STORAGE_DRIVER === 's3' && !!env.S3_PUBLIC_URL)
  @IsUrl({ require_tld: false }, { message: 'S3_PUBLIC_URL must be a URL' })
  S3_PUBLIC_URL?: string;

  @IsString()
  @MinLength(16, { message: 'JWT_SECRET must be at least 16 characters' })
  JWT_SECRET: string;
}

/** Fails fast at boot if required environment variables are missing or invalid. */
export function validateEnv(config: Record<string, unknown>) {
  if (typeof config.STORAGE_DRIVER === 'string') {
    config.STORAGE_DRIVER = config.STORAGE_DRIVER.toLowerCase();
  }
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    throw new Error(`Invalid environment configuration:\n - ${messages.join('\n - ')}`);
  }
  return config;
}
