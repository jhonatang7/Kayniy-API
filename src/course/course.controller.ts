import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @ApiOperation({ summary: 'Create course' })
  @ApiResponse({ status: 201, description: 'The course has been successfully created.' })
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.create(createCourseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  findAll() {
    return this.courseService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by id' })
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update course' })
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.courseService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete course' })
  remove(@Param('id') id: string) {
    return this.courseService.remove(id);
  }

  @Get('community/:communityId')
  @ApiOperation({ summary: 'Get courses by community' })
  findByCommunity(@Param('communityId') communityId: string) {
    return this.courseService.findByCommunity(communityId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get courses by user' })
  findByUser(@Param('userId') userId: string) {
    return this.courseService.findByUser(userId);
  }
}