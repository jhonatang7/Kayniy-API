import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('lessons')
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @ApiOperation({ summary: 'Create lesson' })
  @ApiResponse({ status: 201, description: 'The lesson has been successfully created.' })
  create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonService.create(createLessonDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lessons' })
  findAll() {
    return this.lessonService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lesson by id' })
  findOne(@Param('id') id: string) {
    return this.lessonService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lesson' })
  update(@Param('id') id: string, @Body() updateLessonDto: UpdateLessonDto) {
    return this.lessonService.update(id, updateLessonDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete lesson' })
  remove(@Param('id') id: string) {
    return this.lessonService.remove(id);
  }

  @Get('module/:moduleId')
  @ApiOperation({ summary: 'Get lessons by module' })
  findByModule(@Param('moduleId') moduleId: string) {
    return this.lessonService.findByModule(moduleId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get lessons by type' })
  findByType(@Param('type') type: string) {
    return this.lessonService.findByType(type);
  }
}