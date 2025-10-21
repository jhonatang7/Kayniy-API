import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create notification' })
  @ApiResponse({ status: 201, description: 'The notification has been successfully created.' })
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple notifications' })
  @ApiResponse({ status: 201, description: 'The notifications have been successfully created.' })
  createMany(@Body() createNotificationDtos: CreateNotificationDto[]) {
    return this.notificationService.createMany(createNotificationDtos);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  findAll() {
    return this.notificationService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by id' })
  findOne(@Param('id') id: string) {
    return this.notificationService.findOne(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get notifications by user' })
  findByUser(@Param('userId') userId: string) {
    return this.notificationService.findByUser(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update notification' })
  update(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto) {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  remove(@Param('id') id: string) {
    return this.notificationService.remove(id);
  }

  @Delete('user/:userId')
  @ApiOperation({ summary: 'Delete all notifications for a user' })
  removeAllByUser(@Param('userId') userId: string) {
    return this.notificationService.removeAllByUser(userId);
  }
}