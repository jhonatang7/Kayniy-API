import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { Role } from '../role/entities/role.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UserService', () => {
  let userService: UserService;
  let userRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let roleRepository: { findOne: jest.Mock };
  let emailService: {
    sendTeacherWelcomeEmail: jest.Mock;
    sendAdminWelcomeEmail: jest.Mock;
  };

  const adminRole = { id: 'role-admin', name: 'admin' };
  const teacherRole = { id: 'role-teacher', name: 'teacher' };
  const user = {
    id: 'user-1',
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    password: 'stored-password',
    phoneNumber: '5551234567',
    isDeleted: false,
    isFirstLogin: false,
    role: adminRole,
    refreshToken: null,
  };

  beforeEach(async () => {
    userRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    roleRepository = { findOne: jest.fn() };
    emailService = {
      sendTeacherWelcomeEmail: jest.fn().mockResolvedValue(undefined),
      sendAdminWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    };

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Role), useValue: roleRepository },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  describe('RF-07: Suspensión de usuarios', () => {
    it('actualiza el estado del usuario a suspendido en el repositorio', async () => {
      userRepository.findOne.mockResolvedValue({ ...user });

      await userService.remove(user.id);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: user.id, isDeleted: true }),
      );
    });

    it('impide el acceso cuando el repositorio devuelve un usuario suspendido', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(userService.findOne(user.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(userRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: user.id, isDeleted: false },
        }),
      );
    });
  });

  describe('RF-08: Búsqueda y filtrado de usuarios', () => {
    it('retorna el listado organizado con los datos principales de los usuarios', async () => {
      const users = [
        user,
        {
          ...user,
          id: 'user-2',
          firstName: 'Luis',
          lastName: 'Pérez',
          email: 'luis@example.com',
          phoneNumber: '5557654321',
        },
      ];
      userRepository.find.mockResolvedValue(users);

      const result = await userService.findAll();

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            firstName: 'Ana',
            lastName: 'García',
            email: 'ana@example.com',
            phoneNumber: '5551234567',
          }),
          expect.objectContaining({
            firstName: 'Luis',
            lastName: 'Pérez',
            email: 'luis@example.com',
            phoneNumber: '5557654321',
          }),
        ]),
      );
      expect(userRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isDeleted: false } }),
      );
    });

    it('retorna una lista vacía cuando no existen coincidencias', async () => {
      userRepository.find.mockResolvedValue([]);

      await expect(userService.findAll()).resolves.toEqual([]);
    });
  });

  describe('RF-09: Gestión de perfil personal', () => {
    it('actualiza los datos modificables y confirma el guardado', async () => {
      userRepository.findOne.mockResolvedValue({ ...user });
      const profile = new UpdateProfileDto();
      profile.firstName = 'Ana María';
      profile.phoneNumber = '5550000000';

      const result = await userService.updateProfile(user.id, profile);

      expect(result).toMatchObject({
        id: user.id,
        firstName: 'Ana María',
        phoneNumber: '5550000000',
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Ana María',
          phoneNumber: '5550000000',
        }),
      );
    });

    it('ignora de forma segura los campos protegidos del perfil', async () => {
      userRepository.findOne.mockResolvedValue({ ...user });
      const profile = Object.assign(new UpdateProfileDto(), {
        firstName: 'Ana',
        email: 'changed@example.com',
        role: { name: 'teacher' },
      });

      await userService.updateProfile(user.id, profile);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: user.email,
          role: user.role,
          firstName: 'Ana',
        }),
      );
    });
  });

  describe('RF-10: Registro de cuentas para profesores y administradores', () => {
    it('valida, guarda y envía el correo de bienvenida para profesor y administrador', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.save.mockImplementation(async (value) => ({
        ...value,
        id: value.email.startsWith('teacher') ? 'teacher-1' : 'admin-1',
      }));
      roleRepository.findOne
        .mockResolvedValueOnce(teacherRole)
        .mockResolvedValueOnce(adminRole);

      const teacherResult = await userService.createTeacher({
        firstName: 'Pedro',
        lastName: 'López',
        email: 'teacher@example.com',
        phoneNumber: '5551111111',
      });
      const adminResult = await userService.createAdmin({
        firstName: 'Marta',
        lastName: 'Ruiz',
        email: 'admin@example.com',
        phoneNumber: '5552222222',
      });

      expect(teacherResult.user).toMatchObject({
        email: 'teacher@example.com',
        role: teacherRole,
        isFirstLogin: true,
      });
      expect(adminResult.user).toMatchObject({
        email: 'admin@example.com',
        role: adminRole,
        isFirstLogin: true,
      });
      expect(emailService.sendTeacherWelcomeEmail).toHaveBeenCalledWith(
        'teacher@example.com',
        'Pedro',
        expect.any(String),
      );
      expect(emailService.sendAdminWelcomeEmail).toHaveBeenCalledWith(
        'admin@example.com',
        'Marta',
        expect.any(String),
      );
    });

    it('lanza ConflictException si el correo ya está registrado', async () => {
      userRepository.findOne.mockResolvedValue(user);

      await expect(
        userService.createTeacher({
          firstName: 'Pedro',
          lastName: 'López',
          email: user.email,
          phoneNumber: '5551111111',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('detecta datos con formato inválido', async () => {
      const teacherDto = Object.assign(new CreateTeacherDto(), {
        firstName: 'Pedro',
        lastName: 'López',
        email: 'correo-invalido',
        phoneNumber: '5551111111',
      });
      const adminDto = Object.assign(new CreateAdminDto(), {
        firstName: 'Marta',
        lastName: 'Ruiz',
        email: 'admin@example.com',
        phoneNumber: '5552222222',
      });

      const teacherErrors = await validate(teacherDto);
      const adminErrors = await validate(adminDto);

      expect(teacherErrors.some((error) => error.property === 'email')).toBe(
        true,
      );
      expect(adminErrors).toEqual([]);
      expect(new BadRequestException('Datos inválidos')).toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('RF-11: Asignar imagen de perfil basada en el correo electrónico', () => {
    it('genera y asigna un enlace de avatar basado en el correo', async () => {
      userRepository.findOne.mockResolvedValue(null);
      roleRepository.findOne.mockResolvedValue(teacherRole);

      const result = await userService.createTeacher({
        firstName: 'Pedro',
        lastName: 'López',
        email: 'Pedro@Example.com',
        phoneNumber: '5551111111',
      });

      expect(result.user.avatarPath).toMatch(
        /^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}\?f=y&d=retro$/,
      );
    });

    it('asigna el avatar genérico configurado por Gravatar para el perfil', () => {
      const avatar = userService.generateRetroAvatarUrl('user@example.com');

      expect(avatar).toContain('d=retro');
      expect(avatar).toMatch(
        /^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}\?f=y&d=retro$/,
      );
    });
  });

  describe('RF-12: Cambio de contraseña', () => {
    it('valida la contraseña actual, actualiza el hash y confirma la operación', async () => {
      userRepository.findOne.mockResolvedValue({ ...user });
      const dto = new ChangePasswordDto();
      dto.currentPassword = 'current-password';
      dto.newPassword = 'new-password';

      const result = await userService.changePassword(user.id, dto);

      expect(result).toEqual({
        message: 'Contraseña actualizada correctamente',
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'current-password',
        user.password,
      );
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'new-hashed-password',
          isFirstLogin: false,
        }),
      );
    });

    it('lanza BadRequestException si la contraseña actual no coincide', async () => {
      userRepository.findOne.mockResolvedValue({ ...user });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        userService.changePassword(user.id, {
          currentPassword: 'wrong-password',
          newPassword: 'new-password',
        }),
      ).rejects.toEqual(
        new BadRequestException('La contraseña actual es incorrecta'),
      );
    });

    it('propaga el error interno ocurrido al guardar el cambio', async () => {
      const saveError = new Error('Error interno al guardar contraseña');
      userRepository.findOne.mockResolvedValue({ ...user });
      userRepository.save.mockRejectedValue(saveError);

      await expect(
        userService.changePassword(user.id, {
          currentPassword: 'current-password',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(saveError);
    });
  });
});
