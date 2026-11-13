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
import { UserProgressService } from './user-progress.service';
import { CreateUserProgressDto } from './dto/create-user-progress.dto';
import { RegisterLessonProgressDto } from './dto/register-lesson-progress.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('user-progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-progress')
export class UserProgressController {
  constructor(private readonly userProgressService: UserProgressService) {}

  @Post()
  @ApiOperation({ summary: 'Create user progress' })
  @ApiResponse({ status: 201, description: 'The progress has been successfully created.' })
  create(@Body() createDto: CreateUserProgressDto) {
    return this.userProgressService.create(createDto);
  }

  @Post('lessons')
  //@UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Register a completed lesson for the authenticated user' })
  @ApiResponse({
    status: 201,
    description: 'The lesson progress has been registered successfully.',
  })
  registerLesson(
    @Body() registerDto: RegisterLessonProgressDto,
    @Req() request: Request,
  ) {
    return this.userProgressService.registerLesson(
      registerDto.lessonId,
      registerDto.courseEnrollmentId,
      request.user['id'],
    );
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