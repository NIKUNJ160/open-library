import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AIController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    
    // We will just mock the OpenaiService inside the E2E to avoid real API calls
    const openaiService = app.get('OpenaiService');
    jest.spyOn(openaiService, 'summarize').mockResolvedValue('Mock summary');
    jest.spyOn(openaiService, 'explain').mockResolvedValue('Mock explanation');
    jest.spyOn(openaiService, 'answerQuestion').mockResolvedValue('Mock answer');
    jest.spyOn(openaiService, 'getRecommendations').mockResolvedValue([]);
    
    const citationService = app.get('CitationService');
    jest.spyOn(citationService, 'generateCitation').mockResolvedValue('Mock citation');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/ai/summarize (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/ai/summarize')
      .send({ text: 'Some text', length: 'short', tone: 'neutral' })
      .expect(201)
      .expect((res) => {
        expect(res.body.summary).toBe('Mock summary');
      });
  });

  it('/api/v1/ai/summarize (POST) with invalid data', () => {
    return request(app.getHttpServer())
      .post('/api/v1/ai/summarize')
      .send({ invalid: 'data' }) // Missing required text/documentUrl
      .expect(400);
  });

  it('/api/v1/ai/eli5 (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/ai/eli5')
      .send({ text: 'Complex concept' })
      .expect(201)
      .expect((res) => {
        expect(res.body.explanation).toBe('Mock explanation');
      });
  });

  it('/api/v1/ai/cite (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/ai/cite')
      .send({ metadata: { title: 'Book' }, format: 'apa' })
      .expect(201)
      .expect((res) => {
        expect(res.body.citation).toBe('Mock citation');
      });
  });

  it('/api/v1/ai/ask (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/ai/ask')
      .send({ text: 'Context', question: 'What?' })
      .expect(201)
      .expect((res) => {
        expect(res.body.answer).toBe('Mock answer');
      });
  });

  it('/api/v1/ai/recommendations (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/ai/recommendations?documentId=123&limit=5')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.recommendations)).toBe(true);
      });
  });
});
