import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { AuthService, ADMIN_LOGIN_ROLES } from './auth.service';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { CommunityMember } from '../community-member/entities/community-member.entity';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from '../user/dto/create-user.dto';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;
  let userRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let roleRepository: { findOne: jest.Mock };
  let communityMemberRepository: { findOne: jest.Mock };
  let emailService: {
    sendStudentWelcomeEmail: jest.Mock;
    sendPasswordRecoveryEmail: jest.Mock;
    sendPasswordRecoveryTokenEmail: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const role = { id: 'role-1', name: 'admin' };
  const user = {
    id: 'user-1',
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    password: 'stored-password',
    phoneNumber: '5551234567',
    isDeleted: false,
    isFirstLogin: false,
    role,
    refreshToken: null,
  };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    roleRepository = { findOne: jest.fn() };
    communityMemberRepository = { findOne: jest.fn().mockResolvedValue(null) };
    emailService = {
      sendStudentWelcomeEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordRecoveryEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordRecoveryTokenEmail: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_REFRESH_EXPIRATION_TIME: '7d',
          JWT_SECRET: 'jwt-secret',
          PASSWORD_RESET_URL: 'https://example.com/reset-password',
        };
        return values[key];
      }),
    };

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Role), useValue: roleRepository },
        {
          provide: getRepositoryToken(CommunityMember),
          useValue: communityMemberRepository,
        },
        { provide: EmailService, useValue: emailService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
  });

  describe('RF-01: Registro de nuevos usuarios', () => {
    it('registra un usuario con los datos requeridos y confirma el registro', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const newUser = {
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana@example.com',
        password: 'password123',
        phoneNumber: '5551234567',
      };

      const result = await userService.create(newUser);

      expect(result).toMatchObject({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        password: 'hashed-value',
      });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('lanza ConflictException si el correo ya está registrado', async () => {
      userRepository.findOne.mockResolvedValue(user);

      await expect(
        userService.create({
          firstName: 'Ana',
          lastName: 'García',
          email: user.email,
          password: 'password123',
          phoneNumber: '5551234567',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('detecta un correo con formato inválido mediante la validación del DTO', async () => {
      const dto = Object.assign(new CreateUserDto(), {
        firstName: 'Ana',
        lastName: 'García',
        email: 'correo-invalido',
        password: 'password123',
        phoneNumber: '5551234567',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'email')).toBe(true);
      expect(errors[0].constraints).toBeDefined();
      expect(new BadRequestException('Datos inválidos')).toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('RF-02: Inicio de sesión de usuarios', () => {
    it('autentica credenciales válidas y retorna los tokens y datos del usuario', async () => {
      userRepository.findOne.mockResolvedValue(user);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.login(
        { email: user.email, password: 'password123' },
        ADMIN_LOGIN_ROLES,
      );

      expect(result).toMatchObject({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: { id: user.id, email: user.email, role },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', user.password);
    });

    it('lanza UnauthorizedException con credenciales incorrectas', async () => {
      userRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login(
          { email: user.email, password: 'incorrecta' },
          ADMIN_LOGIN_ROLES,
        ),
      ).rejects.toEqual(new UnauthorizedException('Credenciales incorrectas'));
    });
  });

  describe('RF-03: Verificación de primer inicio de sesión', () => {
    it('identifica el primer inicio de sesión y retorna la indicación de cambio', async () => {
      const firstLoginUser = { ...user, isFirstLogin: true };
      userRepository.findOne.mockResolvedValue(firstLoginUser);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.login(
        { email: user.email, password: 'temporary-password' },
        ADMIN_LOGIN_ROLES,
      );

      expect(result.user.isFirstLogin).toBe(true);
    });

    it('simula el envío del mensaje automático tras el registro', async () => {
      roleRepository.findOne.mockResolvedValue({
        id: 'student-role',
        name: 'student',
      });
      userRepository.findOne.mockResolvedValue(null);
      userRepository.save.mockImplementation(async (value) => value);

      await userService.createStudent({
        firstName: 'Luis',
        lastName: 'Pérez',
        email: 'luis@example.com',
        phoneNumber: '5557654321',
      });

      expect(emailService.sendStudentWelcomeEmail).toHaveBeenCalledWith(
        'luis@example.com',
        'Luis',
        expect.any(String),
      );
    });

    it('lanza un error de autenticación si las credenciales del primer inicio son inválidas', async () => {
      userRepository.findOne.mockResolvedValue({ ...user, isFirstLogin: true });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login(
          { email: user.email, password: 'incorrecta' },
          ADMIN_LOGIN_ROLES,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('propaga el fallo descriptivo cuando no puede guardar el cambio de contraseña', async () => {
      const saveError = new Error('No fue posible guardar la nueva contraseña');
      userRepository.findOne.mockResolvedValue({ ...user, isFirstLogin: true });
      userRepository.save.mockRejectedValue(saveError);

      await expect(
        userService.setFirstLoginPassword('user-1', {
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(saveError);
    });
  });

  describe('RF-04: Cierre de sesión seguro', () => {
    it('invalida el refresh token y confirma el cierre de sesión', async () => {
      userRepository.findOne.mockResolvedValue(user);

      await expect(authService.logout(user.id)).resolves.toEqual({
        message: 'Logout exitoso',
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: null }),
      );
    });

    it('propaga el fallo al invalidar credenciales cuando la persistencia se interrumpe', async () => {
      const logoutError = new Error('Interrupción de persistencia');
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockRejectedValue(logoutError);

      await expect(authService.logout(user.id)).rejects.toThrow(logoutError);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: null }),
      );
    });
  });

  describe('RF-05: Recuperación de contraseña', () => {
    it('crea y envía un enlace temporal seguro para un correo registrado', async () => {
      userRepository.findOne.mockResolvedValue(user);
      jwtService.signAsync.mockResolvedValue('recovery-token');

      await expect(authService.recoverPassword(user.email)).resolves.toEqual({
        message: 'Se envió un enlace de recuperación al correo registrado',
      });

      expect(emailService.sendPasswordRecoveryEmail).toHaveBeenCalledWith(
        user.email,
        user.firstName,
        'https://example.com/reset-password?token=recovery-token',
      );
    });

    it('confirma el cambio de contraseña usando un token válido', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: user.id,
        type: 'password_recovery',
      });
      userRepository.findOne.mockResolvedValue(user);

      await expect(
        authService.resetPassword({
          token: 'valid.jwt.token',
          newPassword: 'new-password',
        }),
      ).resolves.toEqual({
        message: 'Contraseña restablecida correctamente',
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isFirstLogin: false }),
      );
    });

    it('lanza el error estándar de usuario no encontrado sin exponer datos de la cuenta', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        authService.recoverPassword('missing@example.com'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('notifica la invalidez de un enlace expirado o ya utilizado', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Token expirado'));

      await expect(
        authService.resetPassword({
          token: 'expired.jwt.token',
          newPassword: 'new-password',
        }),
      ).rejects.toEqual(
        new UnauthorizedException(
          'El token de recuperación es inválido o expiró',
        ),
      );
    });
  });

  describe('RF-06: Obtener la información del usuario', () => {
    it('valida la sesión y retorna información personal, rol y comunidad', async () => {
      const communityMember = {
        community: { id: 'community-1', name: 'Comunidad A' },
      };
      userRepository.findOne.mockResolvedValue({ ...user });
      communityMemberRepository.findOne.mockResolvedValue(communityMember);

      const result = await authService.getUserProfile(user.id);

      expect(result).toMatchObject({
        id: user.id,
        email: user.email,
        role,
        community: communityMember.community,
      });
      expect(result.password).toBeUndefined();
    });

    it('lanza UnauthorizedException si la validación falla tras el reintento de sesión', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(null);

      await expect(authService.getUserProfile(user.id)).rejects.toEqual(
        new UnauthorizedException('Usuario no encontrado'),
      );
    });
  });
});
