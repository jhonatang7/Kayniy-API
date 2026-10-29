import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FirstLoginPasswordDto } from './dto/first-login-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Role } from '../role/entities/role.entity';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return await this.userRepository.save(user);
  }

  async createTeacher(createTeacherDto: CreateTeacherDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createTeacherDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const teacherRole = await this.roleRepository.findOne({
      where: { name: 'teacher' },
    });

    if (!teacherRole) {
      throw new NotFoundException('Teacher role not found');
    }

    const temporaryPassword = randomBytes(12).toString('base64url');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const user = this.userRepository.create({
      ...createTeacherDto,
      password: hashedPassword,
      avatarPath: this.generateRetroAvatarUrl(createTeacherDto.email),
      role: teacherRole,
      isFirstLogin: true,
      isDeleted: false,
    });

    const savedUser = await this.userRepository.save(user);
    await this.emailService.sendTeacherWelcomeEmail(
      savedUser.email,
      savedUser.firstName,
      temporaryPassword,
    );

    const { password, refreshToken, ...safeUser } = savedUser;

    return {
      user: safeUser,
      temporaryPassword,
    };
  }

  async createAdmin(createAdminDto: CreateAdminDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createAdminDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const adminRole = await this.roleRepository.findOne({
      where: { name: 'admin' },
    });

    if (!adminRole) {
      throw new NotFoundException('Admin role not found');
    }

    const temporaryPassword = randomBytes(12).toString('base64url');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const user = this.userRepository.create({
      ...createAdminDto,
      password: hashedPassword,
      avatarPath: this.generateRetroAvatarUrl(createAdminDto.email),
      role: adminRole,
      isFirstLogin: true,
      isDeleted: false,
    });

    const savedUser = await this.userRepository.save(user);
    await this.emailService.sendAdminWelcomeEmail(
      savedUser.email,
      savedUser.firstName,
      temporaryPassword,
    );

    const { password, refreshToken, ...safeUser } = savedUser;

    return {
      user: safeUser,
      temporaryPassword,
    };
  }

  async createStudent(createStudentDto: CreateStudentDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createStudentDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const studentRole = await this.roleRepository.findOne({
      where: { name: 'student' },
    });

    if (!studentRole) {
      throw new NotFoundException('Student role not found');
    }

    const temporaryPassword = randomBytes(12).toString('base64url');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const user = this.userRepository.create({
      ...createStudentDto,
      password: hashedPassword,
      avatarPath: this.generateRetroAvatarUrl(createStudentDto.email),
      role: studentRole,
      isFirstLogin: true,
      isDeleted: false,
    });

    const savedUser = await this.userRepository.save(user);
    await this.emailService.sendStudentWelcomeEmail(
      savedUser.email,
      savedUser.firstName,
      temporaryPassword,
    );

    const { password, refreshToken, ...safeUser } = savedUser;

    return {
      user: safeUser,
      temporaryPassword,
    };
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['role', 'courses', 'liveClasses'],
      where: { isDeleted: false },
    });
  }

  async findByRole(role: string): Promise<User[]> {
    const normalizedRole = role.toLowerCase();
    const allowedRoles = ['teacher', 'student'];

    if (!allowedRoles.includes(normalizedRole)) {
      throw new BadRequestException('Role must be teacher or student');
    }

    return await this.userRepository.find({
      where: {
        isDeleted: false,
        role: { name: normalizedRole },
      },
    });
  }

  async findAdmins(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['role', 'courses', 'liveClasses'],
      where: {
        isDeleted: false,
        role: { name: 'admin' },
      },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['role', 'courses', 'liveClasses'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async setFirstLoginPassword(
    id: string,
    firstLoginPasswordDto: FirstLoginPasswordDto,
  ) {
    const user = await this.findOne(id);
    user.password = await bcrypt.hash(firstLoginPasswordDto.newPassword, 10);
    user.isFirstLogin = false;

    const savedUser = await this.userRepository.save(user);
    const { password, refreshToken, ...safeUser } = savedUser;
    return safeUser;
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.findOne(id);
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    user.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
    user.isFirstLogin = false;
    await this.userRepository.save(user);

    return { message: 'Contraseña actualizada correctamente' };
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.findOne(id);
    Object.assign(user, updateProfileDto);

    const savedUser = await this.userRepository.save(user);
    const { password, refreshToken, ...safeUser } = savedUser;
    return safeUser;
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.findOne(id);
    user.password = await bcrypt.hash(newPassword, 10);
    user.isFirstLogin = false;
    await this.userRepository.save(user);
  }

  async sendPasswordRecoveryEmail(user: User, resetUrl: string) {
    await this.emailService.sendPasswordRecoveryEmail(
      user.email,
      user.firstName,
      resetUrl,
    );
  }

  async sendPasswordRecoveryTokenEmail(user: User, recoveryToken: string) {
    await this.emailService.sendPasswordRecoveryTokenEmail(
      user.email,
      user.firstName,
      recoveryToken,
    );
  }

  async updateTeacherProfile(
    id: string,
    updateTeacherProfileDto: UpdateTeacherProfileDto,
  ): Promise<User> {
    const user = await this.findOne(id);

    if (user.role?.name !== 'teacher') {
      throw new BadRequestException('User is not a teacher');
    }

    const teacherProfileUpdates = Object.fromEntries(
      Object.entries(updateTeacherProfileDto).filter(([, value]) => value !== undefined),
    );
    Object.assign(user, teacherProfileUpdates);

    return await this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.isDeleted = true;
    await this.userRepository.save(user);
  }

  async removeAdmin(id: string): Promise<void> {
    const user = await this.findOne(id);

    if (user.role?.name !== 'admin') {
      throw new BadRequestException('User is not an admin');
    }

    user.isDeleted = true;
    await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email, isDeleted: false },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  generateRetroAvatarUrl(email: string): string {
    // 1. Limpiar el correo (indispensable para que el hash sea consistente)
    const cleanEmail = email.trim().toLowerCase();

    // 2. Crear el Hash MD5 en formato hexadecimal
    const hash = createHash('md5').update(cleanEmail).digest('hex');

    // 3. Retornar la URL con el parámetro 'retro' y forzar el default (f=y)
    return `https://www.gravatar.com/avatar/${hash}?f=y&d=retro`;
  }
}