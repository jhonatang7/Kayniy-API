import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CourseEnrollmentService } from './course-enrollment.service';
import { CreateCourseEnrollmentDto } from './dto/create-course-enrollment.dto';
import { UpdateCourseEnrollmentDto } from './dto/update-course-enrollment.dto';

@ApiTags('course-enrollments')
@Controller('course-enrollments')
export class CourseEnrollmentController {
  constructor(
    private readonly courseEnrollmentService: CourseEnrollmentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Enroll a user in a course' })
  create(@Body() createDto: CreateCourseEnrollmentDto) {
    return this.courseEnrollmentService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all course enrollments' })
  findAll() {
    return this.courseEnrollmentService.findAll();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get course enrollments by user' })
  findByUser(@Param('userId') userId: string) {
    return this.courseEnrollmentService.findByUser(userId);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get course enrollments by course' })
  findByCourse(@Param('courseId') courseId: string) {
    return this.courseEnrollmentService.findByCourse(courseId);
  }

  @Get('check/:userId/:courseId')
  @ApiOperation({ summary: 'Check whether a user is enrolled in a course' })
  isUserEnrolled(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.courseEnrollmentService.isUserEnrolled(userId, courseId);
  }

  @Get('my-courses/:userId')
  @ApiOperation({ summary: 'Get courses enrolled by a student with progress' })
  findMyCourses(@Param('userId') userId: string) {
    return this.courseEnrollmentService.findMyCourses(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course enrollment by id' })
  findOne(@Param('id') id: string) {
    return this.courseEnrollmentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update course enrollment progress' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCourseEnrollmentDto,
  ) {
    return this.courseEnrollmentService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove course enrollment' })
  remove(@Param('id') id: string) {
    return this.courseEnrollmentService.remove(id);
  }
}
