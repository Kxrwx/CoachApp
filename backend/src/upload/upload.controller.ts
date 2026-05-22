// src/upload/upload.controller.ts
import { 
  Controller, 
  Post, 
  Delete,
  Param,
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
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

  @UseGuards(AuthGuard)
  @Delete('activity/:id')
  async deleteActivityUpload(
    @Param('id') activityId: string,
    @Req() req: any
  ) {
    return await this.uploadService.deleteUpload(req.user.sub, activityId);
  }
}