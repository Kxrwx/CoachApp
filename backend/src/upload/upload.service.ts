// src/upload/upload.service.ts
import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
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

  // 🛠️ NOUVELLE MÉTHODE : Extraction de la date depuis le fichier brut
  private async extractStartDate(buffer: Buffer, extension: string): Promise<Date> {
    if (extension === 'gpx') {
      const content = buffer.toString('utf-8');
      const match = content.match(/<time>(.*?)<\/time>/);
      if (match && match[1]) return new Date(match[1]);
      throw new BadRequestException("Date introuvable dans le fichier GPX.");
    }

    if (extension === 'fit') {
      return new Promise((resolve, reject) => {
        const fitParser = new FitParser({
          force: true,
          mode: 'cascade', // Garde le mode cascade pour explorer toute l'arborescence
        });

        fitParser.parse(buffer, (error: any, data: any) => {
          if (error) {
            return reject(new BadRequestException("Erreur de lecture du binaire FIT."));
          }

          // 🔍 On cherche la date dans l'ordre de priorité :
          // 1. Dans le message global de l'activité
          // 2. Dans la première session
          // 3. Dans le premier point de trace (record)
          // 4. Dans le message 'file_id' (date de création du fichier)
          
          const startTime = 
            data?.activity?.timestamp || 
            data?.sessions?.[0]?.start_time || 
            data?.records?.[0]?.timestamp ||
            data?.file_ids?.[0]?.time_created;

          if (startTime) {
            this.logger.log(`Date extraite du fichier FIT : ${startTime}`);
            resolve(new Date(startTime));
          } else {
            // Log du contenu pour debug si ça échoue encore
            this.logger.error("Structure FIT inconnue. Clés trouvées : " + Object.keys(data || {}).join(', '));
            reject(new BadRequestException("Aucune date de début trouvée dans le fichier FIT."));
          }
        });
      });
    }

    throw new BadRequestException("Format non pris en charge.");
  }

  // 🚀 Méthode d'upload mise à jour (plus besoin de startDateStr)
  async handleFileUpload(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier manquant');

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !['gpx', 'fit'].includes(extension)) {
      throw new BadRequestException('Format invalide (.gpx/.fit uniquement).');
    }

    const mimeType = extension === 'gpx' ? 'application/gpx+xml' : 'application/octet-stream';
    
    // 🔥 Extraction de la VRAIE date de l'activité depuis le fichier
    const startDate = await this.extractStartDate(file.buffer, extension);
    
    // 1. Génération du dataId pour le fichier physique
    const dataId = crypto.randomUUID();
    const r2Key = `users/${userId}/uploads/${dataId}.${extension}`;

    try {
      // 2. Upload vers R2
      await this.r2Service.uploadOrUpdateFile(r2Key, file.buffer, mimeType);

      // 3. Logique de base de données
      return await this.prisma.$transaction(async (tx) => {
        
        // A. Création de l'entrée UploadActivity
        const uploadDetail = await tx.uploadActivity.create({
          data: { dataId }
        });

        // B. Recherche et fusion si une activité existe à cette date précise (marge de +/- 1 minute)
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
          this.logger.log(`[Upload] Rattachement à l'activité existante : ${activity.id}`);
        } else {
          // Sinon, on crée la nouvelle activité avec la VRAIE date
          activity = await tx.activity.create({
            data: {
              userId,
              idUpload: uploadDetail.id,
              startDate: startDate,
            }
          });
          this.logger.log(`[Upload] Nouvelle activité créée : ${activity.id}`);
        }

        // C. Création des métadonnées de stockage
        await tx.storageMetadata.create({
          data: {
            r2Key,
            mimeType,
            fileSize: file.size,
            source: StorageSource.UPLOAD,
            activityId: activity.id,
          }
        });

        return { activityId: activity.id, dataId, startDate };
      });

    } catch (error) {
      this.logger.error(`Erreur upload pour user ${userId}`, error);
      throw new InternalServerErrorException("Erreur lors de l'enregistrement de l'activité.");
    }
  }
}