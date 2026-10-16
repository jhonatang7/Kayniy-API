import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CourseModuleService } from './course-module.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';

@ApiTags('course-modules')
@Controller('course-modules')
export class CourseModuleController {
  constructor(private readonly courseModuleService: CourseModuleService) {}

  @Post()
  @ApiOperation({ summary: 'Assign a module to a course' })
  create(@Body() createCourseModuleDto: CreateCourseModuleDto) {
    return this.courseModuleService.create(createCourseModuleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get course-module assignments' })
  findAll() {
    return this.courseModuleService.findAll();
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get modules assigned to a course ordered by position' })
  findByCourse(@Param('courseId') courseId: string) {
    return this.courseModuleService.findByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course-module assignment' })
  findOne(@Param('id') id: string) {
    return this.courseModuleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a module position in a course' })
  update(@Param('id') id: string, @Body() updateCourseModuleDto: UpdateCourseModuleDto) {
    return this.courseModuleService.update(id, updateCourseModuleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a module from a course' })
  remove(@Param('id') id: string) {
    return this.courseModuleService.remove(id);
  }
}