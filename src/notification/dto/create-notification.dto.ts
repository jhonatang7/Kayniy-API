import { IsNotEmpty, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'User ID who will receive the notification' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;
}