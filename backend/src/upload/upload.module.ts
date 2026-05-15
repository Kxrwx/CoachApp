
import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { R2Module } from '../r2/r2.module';
import { PrismaModule } from '../prisma/prisma.module'; 
import FitParser from 'fit-file-parser';

@Module({
  imports: [
    PrismaModule, 
    R2Module, 
    FitParser
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}