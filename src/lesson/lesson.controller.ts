import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { LessonType } from './dto/create-lesson.dto';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('lessons')
@Controller('lessons')
export class LessonController {
  constructor(
    private readonly lessonService: LessonService,
    private readonly cloudflareService: CloudflareService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create lesson' })
  @ApiResponse({
    status: 201,
    description: 'The lesson has been successfully created.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Lesson data with optional PDF file',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        urlContent: { type: 'string' },
        duration: { type: 'number' },
        type: { type: 'string', enum: ['VIDEO', 'DOCUMENT'] },
        moduleId: { type: 'string' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file (only for DOCUMENT type)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createLessonDto: CreateLessonDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    // Generar UUID para la lección
    const lessonId = uuidv4();

    // Si es tipo DOCUMENT y hay archivo, subir a R2 con el ID generado
    if (createLessonDto.type === LessonType.DOCUMENT && file) {
      const urlContent = await this.cloudflareService.uploadFile(
        file,
        'lesson-pdf',
        lessonId,
      );
      createLessonDto.urlContent = urlContent;
    }

    // Crear la lección con el ID generado
    return this.lessonService.create(createLessonDto, lessonId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lessons' })
  findAll() {
    return this.lessonService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lesson by id' })
  findOne(@Param('id') id: string) {
    return this.lessonService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lesson' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Lesson data with optional PDF file',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        urlContent: { type: 'string' },
        duration: { type: 'number' },
        type: { type: 'string', enum: ['VIDEO', 'DOCUMENT'] },
        moduleId: { type: 'string' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file (only for DOCUMENT type)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    const lesson = await this.lessonService.findOne(id);

    // Si se envía un archivo y el tipo es DOCUMENT, subir el nuevo archivo con el ID de la lección
    if (file && lesson.type === LessonType.DOCUMENT) {
      // Subir el nuevo archivo usando el ID de la lección (sobreescribe automáticamente el anterior)
      const urlContent = await this.cloudflareService.uploadFile(
        file,
        'lesson-pdf',
        id,
      );
      updateLessonDto.urlContent = urlContent;
    }

    return this.lessonService.update(id, updateLessonDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete lesson' })
  async remove(@Param('id') id: string) {
    const lesson = await this.lessonService.findOne(id);

    // Si la lección tiene un archivo en R2, eliminarlo
    if (lesson.urlContent && lesson.type === LessonType.DOCUMENT) {
      try {
        await this.cloudflareService.deleteFile(lesson.urlContent);
      } catch (error) {
        console.error('Error deleting file from R2:', error);
      }
    }

    return this.lessonService.remove(id);
  }

  @Get('find-by-module/:moduleId')
  @ApiOperation({ summary: 'Get lessons by module' })
  findByModule(@Param('moduleId') moduleId: string) {
    return this.lessonService.findByModule(moduleId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get lessons by type' })
  findByType(@Param('type') type: string) {
    return this.lessonService.findByType(type);
  }
}
