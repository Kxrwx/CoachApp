import { Injectable, BadRequestException, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { StorageSource } from '@prisma/client';
import * as crypto from 'crypto';

const FitParser = require('fit-file-parser').default;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
  ) {}

  private async extractStartDate(buffer: Buffer, extension: string): Promise<Date> {
    if (extension === 'gpx') {
      const content = buffer.toString('utf-8');
      const match = content.match(/<time>(.*?)<\/time>/);
      if (match && match[1]) return new Date(match[1]);
      throw new BadRequestException("Date introuvable dans le fichier GPX.");
    }

    if (extension === 'fit') {
      return new Promise((resolve, reject) => {
        const fitParser = new FitParser({ force: true, mode: 'cascade' });
        fitParser.parse(buffer, (error: any, data: any) => {
          if (error) return reject(new BadRequestException("Erreur de lecture du binaire FIT."));
          const startTime = data?.activity?.timestamp || data?.sessions?.[0]?.start_time || data?.records?.[0]?.timestamp || data?.file_ids?.[0]?.time_created;
          if (startTime) resolve(new Date(startTime));
          else reject(new BadRequestException("Aucune date de début trouvée dans le fichier FIT."));
        });
      });
    }
    throw new BadRequestException("Format non pris en charge.");
  }

  async handleFileUpload(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier manquant');
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !['gpx', 'fit'].includes(extension)) {
      throw new BadRequestException('Format invalide (.gpx/.fit uniquement).');
    }

    const mimeType = extension === 'gpx' ? 'application/gpx+xml' : 'application/octet-stream';
    const startDate = await this.extractStartDate(file.buffer, extension);
    const dataId = crypto.randomUUID();
    const r2Key = `users/${userId}/uploads/${dataId}.${extension}`;

    try {
      await this.r2Service.uploadOrUpdateFile(r2Key, file.buffer, mimeType);

      return await this.prisma.$transaction(async (tx) => {
        const uploadDetail = await tx.uploadActivity.create({ data: { dataId } });

        let activity = await tx.activity.findFirst({
          where: {
            userId: userId,
            startDate: {
              gte: new Date(startDate.getTime() - 60000),
              lte: new Date(startDate.getTime() + 60000),
            },
          }
        });

        if (activity) {
          activity = await tx.activity.update({
            where: { id: activity.id },
            data: { idUpload: uploadDetail.id }
          });
        } else {
          activity = await tx.activity.create({
            data: { userId, idUpload: uploadDetail.id, startDate: startDate }
          });
        }

        await tx.storageMetadata.create({
          data: { r2Key, mimeType, fileSize: file.size, source: StorageSource.UPLOAD, activityId: activity.id }
        });

        return { activityId: activity.id, dataId, startDate };
      });
    } catch (error) {
      this.logger.error(`Erreur upload pour user ${userId}`, error);
      throw new InternalServerErrorException("Erreur lors de l'enregistrement de l'activité.");
    }
  }

  async deleteUpload(userId: string, activityId: string) {
    try {
      const activity = await this.prisma.activity.findFirst({
        where: { id: activityId, userId },
        include: { 
          uploadDetail: true,
          storage: { where: { source: StorageSource.UPLOAD } } 
        }
      });

      if (!activity || !activity.uploadDetail) {
        throw new NotFoundException("Activité ou fichier d'upload introuvable.");
      }

      for (const file of activity.storage) {
        await this.r2Service.deleteFile(file.r2Key);
        this.logger.log(`[Delete] Fichier R2 supprimé : ${file.r2Key}`);
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.storageMetadata.deleteMany({
          where: { activityId, source: StorageSource.UPLOAD }
        });


        await tx.activity.update({
          where: { id: activityId },
          data: { idUpload: null }
        });

        await tx.uploadActivity.delete({
          where: { id: activity.idUpload! }
        });
      });

      await this.cleanIncompleteActivities(userId);

      return { success: true };
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de l'upload ${activityId}`, error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Échec de la suppression.");
    }
  }

  private async cleanIncompleteActivities(userId: string) {
    try {
      const deleted = await this.prisma.activity.deleteMany({
        where: {
          userId: userId,
          idStrava: null,
          idUpload: null
        },
      });
      if (deleted.count > 0) this.logger.log(`[Clean] ${deleted.count} activités vides supprimées.`);
    } catch (error) {
      this.logger.error(`[Clean] Erreur lors du nettoyage :`, error);
    }
  }
}