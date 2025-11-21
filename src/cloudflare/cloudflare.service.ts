import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { createR2Client } from '../config/r2.config';

@Injectable()
export class CloudflareService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = createR2Client(configService);
    this.bucketName = configService.get<string>('R2_BUCKET_NAME');
    this.publicUrl = configService.get<string>('R2_PUBLIC_URL');
  }

  /**
   * Sube un archivo a R2
   * @param file - Archivo a subir
   * @param folder - Carpeta dentro del bucket (ej: 'lesson-pdf')
   * @param id - ID para el nombre del archivo (ej: lessonId)
   * @returns URL pública del archivo subido
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    id: string,
  ): Promise<string> {
    // Obtener la extensión del archivo original
    const extension = file.originalname.split('.').pop();
    const fileName = `${folder}/${id}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: 'inline',
      // Hacer el archivo público
      ACL: 'public-read',
    });

    await this.s3Client.send(command);

    // Retornar la URL pública del archivo
    return `${this.publicUrl}/${fileName}`;
  }

  /**
   * Elimina un archivo de R2
   * @param fileUrl - URL completa del archivo a eliminar
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extraer el nombre del archivo de la URL
      const fileName = this.extractFileNameFromUrl(fileUrl);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from R2:', error);
      throw error;
    }
  }

  /**
   * Verifica si un archivo existe en R2
   * @param fileUrl - URL completa del archivo
   * @returns true si existe, false si no
   */
  async fileExists(fileUrl: string): Promise<boolean> {
    try {
      const fileName = this.extractFileNameFromUrl(fileUrl);

      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extrae el nombre del archivo de una URL
   * @param url - URL completa del archivo
   * @returns Nombre del archivo con su ruta en el bucket
   */
  private extractFileNameFromUrl(url: string): string {
    // Remover la parte del dominio público para obtener solo el path
    return url.replace(`${this.publicUrl}/`, '');
  }
}
