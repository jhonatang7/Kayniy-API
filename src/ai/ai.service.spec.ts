import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Embedding } from './entities/embedding.entity';
import { AiService } from './ai.service';
import { AnalyticsService } from '../analytics/analytics.service';

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(),
  SchemaType: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
  },
}));

type QueryBuilderMock = {
  select: jest.Mock;
  addSelect: jest.Mock;
  setParameter: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  getRawMany: jest.Mock;
};

const createQueryBuilder = (): QueryBuilderMock => {
  const builder = {
    select: jest.fn(),
    addSelect: jest.fn(),
    setParameter: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    getRawMany: jest.fn(),
  } as QueryBuilderMock;

  builder.select.mockReturnValue(builder);
  builder.addSelect.mockReturnValue(builder);
  builder.setParameter.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  return builder;
};

const vector = () => Array.from({ length: 768 }, (_, index) => index / 768);

describe('AiService', () => {
  let service: AiService;
  let embeddingRepository: {
    query: jest.Mock;
    upsert: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let configService: { get: jest.Mock };
  let analyticsService: {
    getProfessorBottlenecks: jest.Mock;
    getProfessorStudentRisk: jest.Mock;
    getProfessorActivity: jest.Mock;
  };
  let embeddingModel: { embedContent: jest.Mock };
  let chatModel: { generateContent: jest.Mock };

  beforeEach(async () => {
    embeddingModel = { embedContent: jest.fn() };
    chatModel = { generateContent: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('test-gemini-key') };
    analyticsService = {
      getProfessorBottlenecks: jest.fn(),
      getProfessorStudentRisk: jest.fn(),
      getProfessorActivity: jest.fn(),
    };
    embeddingRepository = {
      query: jest.fn(),
      upsert: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    (GoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn(({ model }: { model: string }) =>
        model === 'gemini-embedding-001' ? embeddingModel : chatModel,
      ),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getRepositoryToken(Embedding), useValue: embeddingRepository },
        { provide: ConfigService, useValue: configService },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compile();

    service = module.get(AiService);
  });

  describe('RF-51: Chatbot analítico y tutor inteligente con IA interactiva', () => {
    it('responde una consulta contextualizada usando el material recuperado', async () => {
      const queryBuilder = createQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue([
        {
          source_id: 'lesson-1',
          content: 'La lección explica el promedio de estudio en el minuto 3.',
          distance: '0.12',
        },
      ]);
      embeddingRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      embeddingModel.embedContent.mockResolvedValue({
        embedding: { values: vector() },
      });
      chatModel.generateContent.mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [] } }],
          text: () => 'La métrica sugiere reforzar la lección y revisar el minuto 3.',
        },
      });

      const result = await service.chat(
        {
          communityId: '11111111-1111-4111-8111-111111111111',
          message: '¿Qué sugerencia existe sobre el promedio de estudio?',
          topK: 3,
        },
        { id: 'teacher-1', role: { name: 'teacher' } },
      );

      expect(result.answer).toContain('reforzar la lección');
      expect(result.sources).toEqual([
        { sourceId: 'lesson-1', distance: 0.12 },
      ]);
      expect(chatModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('minuto 3'),
      );
    });

    it('notifica que requiere más información cuando el modelo no comprende la consulta', async () => {
      const queryBuilder = createQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue([]);
      embeddingRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      embeddingModel.embedContent.mockResolvedValue({
        embedding: { values: vector() },
      });
      chatModel.generateContent.mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [] } }],
          text: () => '',
        },
      });

      const result = await service.chat(
        {
          communityId: '11111111-1111-4111-8111-111111111111',
          message: '¿Qué ocurrió con una métrica no indexada?',
        },
        { id: 'teacher-1', role: { name: 'teacher' } },
      );

      expect(result.answer).toContain('suficiente información');
      expect(result.sources).toEqual([]);
    });
  });

  describe('RF-52: Arquitectura RAG e indexación de material educativo', () => {
    it('extrae contenido educativo, genera vectores y los guarda', async () => {
      embeddingRepository.query.mockResolvedValue([
        {
          source_id: 'lesson-1',
          content: 'Curso: Backend. Módulo: RAG. Lección: Embeddings. Duración: 12 minutos',
        },
        {
          source_id: 'question-1',
          content: 'Curso: Backend. Pregunta: ¿Qué es un vector?',
        },
      ]);
      embeddingModel.embedContent
        .mockResolvedValueOnce({ embedding: { values: vector() } })
        .mockResolvedValueOnce({ embedding: { values: vector() } });

      const result = await service.ingest();

      expect(result).toMatchObject({
        processed: 2,
        message: 'Contenido educativo indexado correctamente',
      });
      expect(embeddingModel.embedContent).toHaveBeenCalledTimes(2);
      expect(embeddingRepository.upsert).toHaveBeenCalledTimes(2);
      expect(embeddingRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'lesson-1',
          embedding: expect.any(Array),
        }),
        ['sourceId'],
      );
    });

    it('recupera fragmentos relevantes y los inyecta en el prompt con sus fuentes', async () => {
      const queryBuilder = createQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue([
        {
          source_id: 'lesson-42',
          content: 'El contenido se estudia en el minuto exacto 7.',
          distance: '0.04',
        },
      ]);
      embeddingRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      embeddingModel.embedContent.mockResolvedValue({
        embedding: { values: vector() },
      });
      chatModel.generateContent.mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [] } }],
          text: () => 'Respuesta basada en la fuente lesson-42, minuto 7.',
        },
      });

      const result = await service.chat(
        {
          communityId: '11111111-1111-4111-8111-111111111111',
          message: 'Resume el fragmento recuperado.',
        },
        { id: 'teacher-1', role: { name: 'teacher' } },
      );

      expect(queryBuilder.setParameter).toHaveBeenCalledWith(
        'vector',
        expect.stringContaining('0'),
      );
      expect(chatModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('[lesson-42]'),
      );
      expect(result.sources).toEqual([
        { sourceId: 'lesson-42', distance: 0.04 },
      ]);
    });

    it('registra y omite un fragmento corrupto o excedido sin detener la ingesta global', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      embeddingRepository.query.mockResolvedValue([
        { source_id: 'lesson-invalid', content: 'Texto corrupto' },
        { source_id: 'lesson-valid', content: 'Contenido válido' },
      ]);
      embeddingModel.embedContent
        .mockRejectedValueOnce(new Error('Token limit exceeded'))
        .mockResolvedValueOnce({ embedding: { values: vector() } });

      await expect(service.ingest()).resolves.toMatchObject({ processed: 1 });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('lesson-invalid'),
        expect.any(Error),
      );
      expect(embeddingRepository.upsert).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });
  });
});
