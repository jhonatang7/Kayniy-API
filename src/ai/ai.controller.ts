import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatDto } from './dto/chat.dto';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ingest')
  @ApiOperation({
    summary: 'Extraer contenido educativo y generar sus embeddings',
  })
  ingest() {
    return this.aiService.ingest();
  }

  @Post('chat')
  @ApiOperation({
    summary: 'Responder usando contexto educativo recuperado por similitud',
  })
  chat(@Body() chatDto: ChatDto, @Req() request: Request) {
    return this.aiService.chat(
      chatDto,
      request.user as {
        id: string;
        role?: { name?: string };
      },
    );
  }

  @Get('data')
  getData() {
    return this.aiService.getData();
  }
}
