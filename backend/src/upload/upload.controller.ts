import { 
  Controller, 
  Post, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  Body, 
  Req 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(AuthGuard)
@Post('activity')
@UseInterceptors(FileInterceptor('file'))
async uploadActivity(
  @UploadedFile() file: Express.Multer.File,
  @Req() req: any
) {
  return await this.uploadService.handleFileUpload(req.user.sub, file);
}
}