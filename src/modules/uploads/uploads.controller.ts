import { BadRequestException, Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { StorageService } from './storage.service';

const ALLOWED_MIME = /^image\/(jpeg|png|webp|avif)$/;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const MAX_FILES = 20;

/**
 * Admin panel → vehicle-form-modal image uploader.
 * Upload files here first, then send the returned URLs in the vehicle's `images` array.
 * Files go to local disk or S3-compatible storage, depending on STORAGE_DRIVER.
 */
@ApiTags('Admin / Uploads')
@ApiBearerAuth()
@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('images')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      // Kept in memory (8 MB max each) and passed straight to the storage driver.
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) =>
        ALLOWED_MIME.test(file.mimetype)
          ? cb(null, true)
          : cb(new BadRequestException('Only JPEG, PNG, WebP or AVIF images are allowed'), false),
    }),
  )
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No files uploaded');

    // Check every file's real content before storing any of them.
    const bad = files.filter((f) => !this.storage.detectImage(f.buffer)).map((f) => f.originalname);
    if (bad.length) {
      throw new BadRequestException(`Not a valid JPEG, PNG, WebP or AVIF image: ${bad.join(', ')}`);
    }

    const urls = await Promise.all(files.map((f) => this.storage.putImage('vehicles', f.buffer)));
    return { urls };
  }
}
