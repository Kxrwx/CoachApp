// src/storage/r2.service.ts
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand,GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class R2Service {
  private readonly s3Client: S3Client;
  private readonly bucketName = process.env.R2_BUCKET_NAME;
  private readonly logger = new Logger(R2Service.name);

  constructor() {
    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !this.bucketName) {
      throw new Error("Configuration R2 incomplète dans les variables d'environnement.");
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }


  /**
   *
   *
   * @param {string} key => clé du fichier a récupérer
   * @return {*} => recupere un fichier depuis R2, retourne un buffer du contenu du fichier
   * @memberof R2Service
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const byteArray = await response.Body?.transformToByteArray();
      if (!byteArray) throw new Error("Fichier vide ou corrompu.");
      
      return Buffer.from(byteArray);
    } catch (error) {
      throw new InternalServerErrorException(`Impossible de lire le fichier sur R2 : ${key}`);
    }
  }


  /**
   *
   *
   * @param {string} key => clé du fichier a récupérer
   * @param {Buffer} fileBuffer => nouveau contenu du fichier
   * @param {string} mimeType => type du nouveau/update du fichier
   * @return {*}  => upsert un fichier dans R2
   * @memberof R2Service
   */
  async uploadOrUpdateFile(key: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      this.logger.log(`Upload/Update démarré pour la clé : ${key}`);
      
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType,
          Metadata: { uploadedAt: new Date().toISOString() },
        }),
      );

      this.logger.log(`Fichier uploadé/mis à jour avec succès : ${key}`);
      return key;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Échec de l'upload/update sur R2 pour la clé ${key}`, errorMessage);
      throw new InternalServerErrorException(`Impossible d'enregistrer le fichier sur le stockage distant.`);
    }
  }

  /**
   *
   *
   * @param {string} key => clé du fichier a supprimer
   * @return {*}  => supprime le fichier de R2
   * @memberof R2Service
   */
  async deleteFile(key: string): Promise<void> {
    try {
      this.logger.log(`Suppression demandée pour la clé : ${key}`);

      const exists = await this.fileExists(key);
      if (!exists) {
        this.logger.warn(`Tentative de suppression d'un fichier inexistant : ${key}`);
        return;
      }

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      this.logger.log(`Fichier supprimé avec succès de R2 : ${key}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Échec de la suppression sur R2 pour la clé ${key}`, errorMessage);
      throw new InternalServerErrorException(`Impossible de supprimer le fichier du stockage distant.`);
    }
  }


  /**
   *
   *
   * @param {string} key => clé du fichier a verifier si il existe
   * @return {*}  => verifie l'existante du fichier dans R2
   * @memberof R2Service
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      const s3Error = error as any;
      
      if (s3Error?.name === 'NotFound' || s3Error?.$metadata?.httpStatusCode === 404) {
        return false;
      }
      
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Erreur lors de la vérification d'existence de la clé ${key}`, errorMessage);
      throw new InternalServerErrorException(`Erreur de communication avec le stockage distant.`);
    }
  }
}