import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { CommunityMember } from '../community-member/entities/community-member.entity';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';

interface PasswordRecoveryPayload {
  sub: string;
  type: 'password_recovery';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(CommunityMember)
    private readonly communityMemberRepository: Repository<CommunityMember>,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Generar tokens
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    // Guardar el hash del refresh token en la base de datos
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userService.update(user.id, {
      refreshToken: hashedRefreshToken,
    });

    const communityMember = await this.communityMemberRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['community'],
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
        community: communityMember
          ? {
              id: communityMember.community.id,
              name: communityMember.community.name,
            }
          : null,
      },
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const communityMember = await this.communityMemberRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['community'],
    });

    delete user.password;
    return {
      ...user,
      community: communityMember
        ? {
            id: communityMember.community.id,
            name: communityMember.community.name,
          }
        : null,
    };
  }

  private async generateAccessToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access_token',
    };
    return this.jwtService.signAsync(payload);
  }

  private async generateRefreshToken(user: any) {
    const payload = {
      sub: user.id,
      type: 'refresh_token',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION_TIME'),
    });
  }

  async refreshAccessToken(userId: string, refreshToken: string) {
    const user = await this.userService.findOne(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Verificar si el refresh token coincide con el almacenado
    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Solo generar nuevo access token
    const accessToken = await this.generateAccessToken(user);

    return {
      access_token: accessToken,
    };
  }

  async logout(userId: string) {
    // Invalidar el refresh token
    await this.userService.update(userId, {
      refreshToken: null,
    });

    return {
      message: 'Logout exitoso',
    };
  }

  async recoverPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    const resetBaseUrl =
      this.configService.get<string>('PASSWORD_RESET_URL') ??
      'https://lumenia.world/reset-password';
    const resetUrl = await this.createPasswordRecoveryUrl(user.id, resetBaseUrl);

    await this.userService.sendPasswordRecoveryEmail(user, resetUrl);

    return { message: 'Se envió un enlace de recuperación al correo registrado' };
  }

  async forgotPasswordMobile(email: string) {
    const user = await this.userService.findByEmail(email);
    const recoveryToken = await this.createPasswordRecoveryToken(user.id);

    await this.userService.sendPasswordRecoveryTokenEmail(user, recoveryToken);

    return {
      message: 'Se envió un token de recuperación al correo registrado',
    };
  }

  private async createPasswordRecoveryUrl(userId: string, baseUrl: string) {
    const recoveryToken = await this.createPasswordRecoveryToken(userId);

    return `${baseUrl}?token=${encodeURIComponent(recoveryToken)}`;
  }

  private async createPasswordRecoveryToken(userId: string) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        type: 'password_recovery',
      },
      { expiresIn: '30m' },
    );
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    let payload: PasswordRecoveryPayload;

    try {
      payload = await this.jwtService.verifyAsync<PasswordRecoveryPayload>(
        resetPasswordDto.token,
        { secret: this.configService.get<string>('JWT_SECRET') },
      );
    } catch {
      throw new UnauthorizedException('El token de recuperación es inválido o expiró');
    }

    if (payload.type !== 'password_recovery' || !payload.sub) {
      throw new UnauthorizedException('El token de recuperación es inválido');
    }

    await this.userService.resetPassword(payload.sub, resetPasswordDto.newPassword);
    return { message: 'Contraseña restablecida correctamente' };
  }
}
