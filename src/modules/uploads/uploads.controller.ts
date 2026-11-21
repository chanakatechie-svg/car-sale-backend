import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

const ALLOWED_MIME = /^image\/(jpeg|png|webp|avif)$/;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const MAX_FILES = 20;

/**
 * Admin panel → vehicle-form-modal image uploader.
 * Upload files here first, then send the returned URLs in the vehicle's `images` array.
 */
@ApiTags('Admin / Uploads')
@ApiBearerAuth()
@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly config: ConfigService) {}

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
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'vehicles'),
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) =>
        ALLOWED_MIME.test(file.mimetype)
          ? cb(null, true)
          : cb(new BadRequestException('Only JPEG, PNG, WebP or AVIF images are allowed'), false),
    }),
  )
  uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No files uploaded');
    const base = this.config.get<string>('publicUrl');
    return { urls: files.map((f) => `${base}/uploads/vehicles/${f.filename}`) };
  }
}
