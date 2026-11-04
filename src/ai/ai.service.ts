import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Content,
  EmbedContentRequest,
  FunctionDeclaration,
  GenerativeModel,
  GenerateContentRequest,
  GoogleGenerativeAI,
  SchemaType,
} from '@google/generative-ai';
import { Repository } from 'typeorm';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsQueryDto } from '../analytics/dto/analytics-query.dto';
import { ChatDto } from './dto/chat.dto';
import { Embedding } from './entities/embedding.entity';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = 'gemini-3.5-flash-lite';
const EMBEDDING_DIMENSIONS = 768;
const PROFESSOR_FUNCTIONS: FunctionDeclaration[] = [
  {
    name: 'get_professor_bottlenecks',
    description: 'Obtiene los quizzes con menor rendimiento de la comunidad.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        courseId: { type: SchemaType.STRING },
        startDate: { type: SchemaType.STRING },
        endDate: { type: SchemaType.STRING },
      },
    },
  },
  {
    name: 'get_professor_student_risk',
    description: 'Obtiene estudiantes con bajo progreso o calificaciones.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        courseId: { type: SchemaType.STRING },
        startDate: { type: SchemaType.STRING },
        endDate: { type: SchemaType.STRING },
      },
    },
  },
  {
    name: 'get_professor_activity',
    description: 'Obtiene los días y horas de mayor actividad de aprendizaje.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        courseId: { type: SchemaType.STRING },
        startDate: { type: SchemaType.STRING },
        endDate: { type: SchemaType.STRING },
      },
    },
  },
];

type EducationalContent = {
  sourceId: string;
  content: string;
};

type RawEducationalContent = {
  source_id: string | null;
  content: string | null;
};

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Embedding)
    private readonly embeddingRepository: Repository<Embedding>,
    private readonly configService: ConfigService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async ingest() {
    const records = await this.extractEducationalContent();
    const embeddingModel = this.getModel(EMBEDDING_MODEL);

    for (const record of records) {
      const result = await this.embed(embeddingModel, record.content);
      const values = result.embedding.values;
      if (values.length !== EMBEDDING_DIMENSIONS) {
        throw new InternalServerErrorException(
          `El modelo de embeddings devolvió ${values.length} dimensiones; se esperaban ${EMBEDDING_DIMENSIONS}`,
        );
      }

      await this.embeddingRepository.upsert(
        {
          sourceId: record.sourceId,
          content: record.content,
          embedding: values,
        },
        ['sourceId'],
      );
    }

    return {
      processed: records.length,
      message: 'Contenido educativo indexado correctamente',
    };
  }

  async chat(
    { message, communityId, courseId, startDate, endDate, topK = 5 }: ChatDto,
    user: { id: string; role?: { name?: string } },
  ) {
    const queryEmbedding = await this.embed(
      this.getModel(EMBEDDING_MODEL),
      message,
    );
    const values = queryEmbedding.embedding.values;
    if (values.length !== EMBEDDING_DIMENSIONS) {
      throw new InternalServerErrorException(
        `El modelo de embeddings devolvió ${values.length} dimensiones; se esperaban ${EMBEDDING_DIMENSIONS}`,
      );
    }

    const vector = `[${values.join(',')}]`;
    const context = await this.embeddingRepository
      .createQueryBuilder('embedding')
      .select([
        'embedding.sourceId AS source_id',
        'embedding.content AS content',
      ])
      .addSelect('embedding.embedding <=> CAST(:vector AS vector)', 'distance')
      .setParameter('vector', vector)
      .orderBy('distance', 'ASC')
      .limit(topK)
      .getRawMany<{ source_id: string; content: string; distance: string }>();

    const contextText = context
      .map((item) => `[${item.source_id}] ${item.content}`)
      .join('\n');
    const prompt = [
      'Eres el asistente analítico de una plataforma de e-learning.',
      'Tienes acceso a herramientas (Function Calling) para consultar las métricas de rendimiento de la comunidad.',
      'SI el usuario pregunta por rendimiento, progreso, métricas, estadísticas, o qué curso va mejor/peor, DEBES llamar a las funciones proporcionadas (ej. get_professor_bottlenecks, get_professor_student_risk) antes de responder.',
      'Una vez que recibas los datos de las funciones, analízalos y explica los resultados en un lenguaje claro y pedagógico en español.',
      'Si la pregunta no es sobre métricas, responde usando únicamente el siguiente contexto educativo proporcionado (RAG).',
      'Si no tienes información, indícalo claramente.',
      `Contexto Educativo:\n${contextText || '(sin contexto indexado)'}`,
      `Pregunta del profesor: ${message}`,
    ].join('\n\n');

    const model = this.getModel(CHAT_MODEL, true);
    const firstResponse = await model.generateContent(prompt);
    const functionCalls =
      firstResponse.response.candidates?.[0]?.content.parts
        .map((part) => part.functionCall)
        .filter((call): call is NonNullable<typeof call> => !!call) ?? [];

    if (functionCalls.length === 0) {
      return {
        answer: firstResponse.response.text(),
        sources: context.map((item) => ({
          sourceId: item.source_id,
          distance: Number(item.distance),
        })),
        metrics: null,
      };
    }

    const metrics = await Promise.all(
      functionCalls.map((call) =>
        this.executeProfessorFunction(call.name, call.args, {
          communityId,
          courseId,
          startDate,
          endDate,
          user,
        }),
      ),
    );
    const functionResponses: Content = {
      role: 'user',
      parts: functionCalls.map((call, index) => ({
        functionResponse: {
          name: call.name,
          response: { data: metrics[index] },
        },
      })),
    };
    const contents: Content[] = [
      { role: 'user', parts: [{ text: prompt }] },
      ...(firstResponse.response.candidates?.[0]?.content
        ? [firstResponse.response.candidates[0].content]
        : []),
      functionResponses,
    ];
    const finalResponse = await model.generateContent({
      contents,
    } as GenerateContentRequest);

    return {
      answer: finalResponse.response.text(),
      sources: context.map((item) => ({
        sourceId: item.source_id,
        distance: Number(item.distance),
      })),
      metrics,
    };
  }

  private getModel(
    model: string,
    withProfessorFunctions = false,
  ): GenerativeModel {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'La integración de Gemini no está configurada: falta GEMINI_API_KEY',
      );
    }
    return new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model,
      tools: withProfessorFunctions
        ? [{ functionDeclarations: PROFESSOR_FUNCTIONS }]
        : undefined,
    });
  }

  private async executeProfessorFunction(
    name: string,
    args: object,
    context: {
      communityId: string;
      courseId?: string;
      startDate?: string;
      endDate?: string;
      user: { id: string; role?: { name?: string } };
    },
  ) {
    const functionArgs = this.getFunctionArguments(args);
    const query: AnalyticsQueryDto = {
      communityId: context.communityId,
      courseId: functionArgs.courseId ?? context.courseId,
      startDate: functionArgs.startDate ?? context.startDate,
      endDate: functionArgs.endDate ?? context.endDate,
    };
    const roleName = context.user.role?.name ?? '';

    switch (name) {
      case 'get_professor_bottlenecks':
        return this.analyticsService.getProfessorBottlenecks(
          context.user.id,
          roleName,
          context.communityId,
          query,
        );
      case 'get_professor_student_risk':
        return this.analyticsService.getProfessorStudentRisk(
          context.user.id,
          roleName,
          context.communityId,
          query,
        );
      case 'get_professor_activity':
        return this.analyticsService.getProfessorActivity(
          context.user.id,
          roleName,
          context.communityId,
          query,
        );
      default:
        throw new InternalServerErrorException(
          `Gemini solicitó una función no permitida: ${name}`,
        );
    }
  }

  private getFunctionArguments(args: object): {
    courseId?: string;
    startDate?: string;
    endDate?: string;
  } {
    const value = args as Record<string, unknown>;
    return {
      courseId: typeof value.courseId === 'string' ? value.courseId : undefined,
      startDate:
        typeof value.startDate === 'string' ? value.startDate : undefined,
      endDate: typeof value.endDate === 'string' ? value.endDate : undefined,
    };
  }

  private embed(model: GenerativeModel, text: string) {
    const request: EmbedContentRequest & { outputDimensionality: number } = {
      content: {
        role: 'user',
        parts: [{ text }],
      },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    };
    return model.embedContent(request);
  }

  private async extractEducationalContent(): Promise<EducationalContent[]> {
    const rows = (await this.embeddingRepository.query(`
      SELECT
        'lesson_' || l.id AS source_id,
        CONCAT(
          'Curso: ', c.name,
          '. Módulo: ', m.title,
          '. Lección: ', l.title,
          COALESCE('. Descripción: ' || NULLIF(l.description, ''), ''),
          COALESCE('. Tipo: ' || NULLIF(l.type, ''), ''),
          COALESCE('. Duración: ' || l.duration || ' minutos', '')
        ) AS content
      FROM lesson l
      INNER JOIN module m ON m.id = l."moduleId"
      INNER JOIN course_module cm ON cm."moduleID" = m.id
      INNER JOIN course c ON c.id = cm."courseID"

      UNION ALL

      SELECT
        'question_' || q.id AS source_id,
        CONCAT(
          'Curso: ', c.name,
          '. Módulo: ', m.title,
          '. Quiz: ', z.name,
          '. Pregunta: ', q.title,
          COALESCE('. Descripción: ' || NULLIF(q.description, ''), ''),
          COALESCE(
            '. Opciones: ' || (
              SELECT STRING_AGG(o.content, ', ' ORDER BY o.id)
              FROM option o
              WHERE o."questionId" = q.id
            ),
            ''
          )
        ) AS content
      FROM question q
      INNER JOIN quiz z ON z.id = q."quizId"
      INNER JOIN module m ON m.id = z."moduleId"
      INNER JOIN course_module cm ON cm."moduleID" = m.id
      INNER JOIN course c ON c.id = cm."courseID"
    `)) as RawEducationalContent[];

    return rows.map((row, index) => {
      if (!row.source_id || !row.content) {
        throw new InternalServerErrorException(
          `El registro educativo ${index + 1} no contiene source_id o content`,
        );
      }

      return {
        sourceId: row.source_id,
        content: row.content,
      };
    });
  }

  async getData() {
    return await this.extractEducationalContent();
  }
}
