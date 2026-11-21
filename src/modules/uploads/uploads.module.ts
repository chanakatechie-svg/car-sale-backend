import { Module, OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { UploadsController } from './uploads.controller';

@Module({
  controllers: [UploadsController],
})
export class UploadsModule implements OnModuleInit {
  onModuleInit() {
    mkdirSync(join(process.cwd(), 'uploads', 'vehicles'), { recursive: true });
  }
}
