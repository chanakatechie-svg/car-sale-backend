import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageDriver } from './storage/local.driver';
import { S3DriverOptions, S3StorageDriver } from './storage/s3.driver';
import { STORAGE_DRIVER, StorageDriver } from './storage/storage.driver';
import { StorageService } from './storage.service';
import { UploadsController } from './uploads.controller';

/** Global so any module (e.g. vehicles) can inject StorageService to clean up files. */
@Global()
@Module({
  controllers: [UploadsController],
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageDriver => {
        const driver = config.get<string>('storage.driver');
        const logger = new Logger('Storage');
        if (driver === 's3') {
          const opts = config.get<S3DriverOptions>('storage.s3')!;
          const s3 = new S3StorageDriver(opts);
          logger.log(`Using S3 bucket "${opts.bucket}" → ${s3.publicBaseUrl}`);
          return s3;
        }
        const local = new LocalStorageDriver(config.get<string>('publicUrl')!);
        logger.log(`Using local disk → ${local.publicBaseUrl}`);
        return local;
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class UploadsModule {}
