import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

export const createR2Client = (configService: ConfigService): S3Client => {
  return new S3Client({
    region: 'auto',
    endpoint: configService.get<string>('R2_ENDPOINT'),
    credentials: {
      accessKeyId: configService.get<string>('R2_ACCESS_KEY_ID'),
      secretAccessKey: configService.get<string>('R2_SECRET_ACCESS_KEY'),
    },
  });
};
