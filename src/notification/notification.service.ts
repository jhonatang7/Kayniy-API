import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      title: createNotificationDto.title,
      message: createNotificationDto.message,
      type: createNotificationDto.type,
      user: { id: createNotificationDto.userId },
    });

    return await this.notificationRepository.save(notification);
  }

  async createMany(notifications: CreateNotificationDto[]): Promise<Notification[]> {
    const notificationEntities = notifications.map(dto => 
      this.notificationRepository.create({
        title: dto.title,
        message: dto.message,
        type: dto.type,
        user: { id: dto.userId },
      })
    );

    return await this.notificationRepository.save(notificationEntities);
  }

  async findAll(): Promise<Notification[]> {
    return await this.notificationRepository.find({
      relations: ['user'],
      order: { sentDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { sentDate: 'DESC' },
    });
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    const notification = await this.findOne(id);

    if (updateNotificationDto.userId) {
      notification.user = { id: updateNotificationDto.userId } as any;
    }

    Object.assign(notification, updateNotificationDto);
    return await this.notificationRepository.save(notification);
  }

  async remove(id: string): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.remove(notification);
  }

  async removeAllByUser(userId: string): Promise<void> {
    const notifications = await this.findByUser(userId);
    await this.notificationRepository.remove(notifications);
  }
}