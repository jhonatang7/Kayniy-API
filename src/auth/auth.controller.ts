import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Authenticacion')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('forgot-password')
  @ApiOperation({ summary: 'Enviar enlace de recuperación por correo' })
  @ApiResponse({ status: 200, description: 'Enlace de recuperación enviado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  recoverPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.recoverPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña usando un token de recuperación' })
  @ApiResponse({ status: 200, description: 'Contraseña restablecida correctamente' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Retorna el token de acceso y la información del usuario',
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Configurar la cookie del refresh token
    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: true, // Solo HTTPS
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
    });

    // Eliminar el refresh token del response
    const { refresh_token, ...responseData } = result;
    return responseData;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Retorna la información del usuario autenticado',
  })
  getMe(@Req() req: Request) {
    return this.authService.getUserProfile(req.user['id']);
  }

  @UseGuards(RefreshTokenGuard)
  @Get('refresh')
  @ApiOperation({ summary: 'Refrescar access token' })
  @ApiResponse({
    status: 200,
    description: 'Retorna un nuevo access token',
  })
  async refreshToken(@Req() req: Request) {
    const userId = req.user['id'];
    const refreshToken = req.cookies.refresh_token;
    return this.authService.refreshAccessToken(userId, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Cierra la sesión del usuario',
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logout(req.user['id']);
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    return result;
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  async testButton(){
    console.log("JHONATAN")
  }
}
