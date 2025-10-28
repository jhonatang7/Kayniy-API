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

@ApiTags('Authenticacion')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Retorna la información del usuario autenticado',
  })
  getProfile(@Req() req: Request) {
    return this.authService.getUserProfile(req.user['id']);
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @ApiBearerAuth()
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
}
