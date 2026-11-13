import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserModuleProgressService } from './user-module-progress.service';
import { CreateUserModuleProgressDto } from './dto/create-user-module-progress.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CompleteModuleDto } from './dto/complete-module.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('user-module-progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-module-progress')
export class UserModuleProgressController {
  constructor(private readonly userModuleProgressService: UserModuleProgressService) {}

  @Post()
  @ApiOperation({ summary: 'Create user module progress' })
  @ApiResponse({ status: 201, description: 'The progress has been successfully created.' })
  create(@Body() createDto: CreateUserModuleProgressDto) {
    return this.userModuleProgressService.create(createDto);
  }

  @Post('complete')
  //@UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Complete a module after validating its content' })
  @ApiResponse({
    status: 201,
    description: 'The module progress has been registered successfully.',
  })
  complete(
    @Body() completeDto: CompleteModuleDto,
    @Req() request: Request,
  ) {
    return this.userModuleProgressService.complete(
      completeDto,
      request.user['id'],
    );
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