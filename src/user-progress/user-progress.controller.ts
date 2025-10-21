import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserProgressService } from './user-progress.service';
import { CreateUserProgressDto } from './dto/create-user-progress.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('user-progress')
@Controller('user-progress')
export class UserProgressController {
  constructor(private readonly userProgressService: UserProgressService) {}

  @Post()
  @ApiOperation({ summary: 'Create user progress' })
  @ApiResponse({ status: 201, description: 'The progress has been successfully created.' })
  create(@Body() createDto: CreateUserProgressDto) {
    return this.userProgressService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user progress' })
  findAll() {
    return this.userProgressService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user progress by id' })
  findOne(@Param('id') id: string) {
    return this.userProgressService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user progress' })
  update(@Param('id') id: string, @Body() updateDto: Partial<CreateUserProgressDto>) {
    return this.userProgressService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user progress' })
  remove(@Param('id') id: string) {
    return this.userProgressService.remove(id);
  }
}