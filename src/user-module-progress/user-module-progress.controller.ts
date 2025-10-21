import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserModuleProgressService } from './user-module-progress.service';
import { CreateUserModuleProgressDto } from './dto/create-user-module-progress.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('user-module-progress')
@Controller('user-module-progress')
export class UserModuleProgressController {
  constructor(private readonly userModuleProgressService: UserModuleProgressService) {}

  @Post()
  @ApiOperation({ summary: 'Create user module progress' })
  @ApiResponse({ status: 201, description: 'The progress has been successfully created.' })
  create(@Body() createDto: CreateUserModuleProgressDto) {
    return this.userModuleProgressService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user module progress' })
  findAll() {
    return this.userModuleProgressService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user module progress by id' })
  findOne(@Param('id') id: string) {
    return this.userModuleProgressService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user module progress' })
  update(@Param('id') id: string, @Body() updateDto: Partial<CreateUserModuleProgressDto>) {
    return this.userModuleProgressService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user module progress' })
  remove(@Param('id') id: string) {
    return this.userModuleProgressService.remove(id);
  }
}