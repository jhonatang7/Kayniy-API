import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FirstLoginPasswordDto } from './dto/first-login-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('me/first-login-password')
  @ApiOperation({ summary: 'Establecer contraseña después del primer inicio de sesión' })
  setFirstLoginPassword(
    @Req() req: Request,
    @Body() firstLoginPasswordDto: FirstLoginPasswordDto,
  ) {
    return this.userService.setFirstLoginPassword(
      req.user['id'],
      firstLoginPasswordDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('me/password')
  @ApiOperation({ summary: 'Actualizar la contraseña del usuario' })
  changePassword(
    @Req() req: Request,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(req.user['id'], changePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('me/profile')
  @ApiOperation({ summary: 'Actualizar nombre, apellido y teléfono del usuario' })
  updateProfile(
    @Req() req: Request,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(req.user['id'], updateProfileDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin', 'admin')
  @Post('create-teacher')
  @ApiOperation({ summary: 'Create teacher with a temporary password' })
  @ApiResponse({ status: 201, description: 'The teacher has been successfully created.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  createTeacher(@Body() createTeacherDto: CreateTeacherDto) {
    return this.userService.createTeacher(createTeacherDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin','admin')
  @Post('create-admin')
  @ApiOperation({ summary: 'Create admin with a temporary password' })
  @ApiResponse({ status: 201, description: 'The admin has been successfully created.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.userService.createAdmin(createAdminDto);
  }

  @Post('create-student')
  @ApiOperation({ summary: 'Create student with a temporary password' })
  @ApiResponse({ status: 201, description: 'The student has been successfully created.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  createStudent(@Body() createStudentDto: CreateStudentDto) {
    return this.userService.createStudent(createStudentDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  findAll() {
    return this.userService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('role/:role')
  @ApiOperation({ summary: 'Get users by role' })
  @ApiParam({ name: 'role', enum: ['teacher', 'student'] })
  findByRole(@Param('role') role: string) {
    return this.userService.findByRole(role);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('admins')
  @ApiOperation({ summary: 'Get all admins' })
  findAdmins() {
    return this.userService.findAdmins();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'The user has been successfully updated.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('admins/:id')
  @ApiOperation({ summary: 'Delete an admin' })
  @ApiResponse({ status: 200, description: 'The admin has been successfully deleted.' })
  @ApiResponse({ status: 400, description: 'The user is not an admin.' })
  removeAdmin(@Param('id') id: string) {
    return this.userService.removeAdmin(id);
  }
}