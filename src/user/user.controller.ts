import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('create-teacher')
  @ApiOperation({ summary: 'Create teacher with a temporary password' })
  @ApiResponse({ status: 201, description: 'The teacher has been successfully created.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  createTeacher(@Body() createTeacherDto: CreateTeacherDto) {
    return this.userService.createTeacher(createTeacherDto);
  }

  @Post('create-admin')
  @ApiOperation({ summary: 'Create admin with a temporary password' })
  @ApiResponse({ status: 201, description: 'The admin has been successfully created.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.userService.createAdmin(createAdminDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  findAll() {
    return this.userService.findAll();
  }

  @Get('role/:role')
  @ApiOperation({ summary: 'Get users by role' })
  @ApiParam({ name: 'role', enum: ['teacher', 'student'] })
  findByRole(@Param('role') role: string) {
    return this.userService.findByRole(role);
  }

  @Get('admins')
  @ApiOperation({ summary: 'Get all admins' })
  findAdmins() {
    return this.userService.findAdmins();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'The user has been successfully updated.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/teacher-profile')
  @ApiOperation({ summary: 'Update teacher profile data' })
  @ApiResponse({ status: 200, description: 'The teacher profile has been successfully updated.' })
  @ApiResponse({ status: 400, description: 'The user is not a teacher.' })
  updateTeacherProfile(
    @Param('id') id: string,
    @Body() updateTeacherProfileDto: UpdateTeacherProfileDto,
  ) {
    return this.userService.updateTeacherProfile(id, updateTeacherProfileDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Delete('admins/:id')
  @ApiOperation({ summary: 'Delete an admin' })
  @ApiResponse({ status: 200, description: 'The admin has been successfully deleted.' })
  @ApiResponse({ status: 400, description: 'The user is not an admin.' })
  removeAdmin(@Param('id') id: string) {
    return this.userService.removeAdmin(id);
  }
}