import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { OpenaiService } from './services/openai.service';
import { CitationService } from './services/citation.service';
import { BadRequestException } from '@nestjs/common';

describe('AiController', () => {
  let controller: AiController;
  let openaiService: OpenaiService;
  let citationService: CitationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: OpenaiService,
          useValue: {
            summarize: jest.fn().mockResolvedValue('Summary of document'),
            explain: jest.fn().mockResolvedValue('Explanation for 5yo'),
            answerQuestion: jest.fn().mockResolvedValue('The answer is 42'),
            getRecommendations: jest.fn().mockResolvedValue([{ id: '1', title: 'Rec 1' }]),
          },
        },
        {
          provide: CitationService,
          useValue: {
            generateCitation: jest.fn().mockResolvedValue('Generated citation text'),
          },
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
    openaiService = module.get<OpenaiService>(OpenaiService);
    citationService = module.get<CitationService>(CitationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('summarize should return summary', async () => {
    const result = await controller.summarize({ text: 'Some long text', length: 'short', tone: 'neutral' });
    expect(result).toEqual({ summary: 'Summary of document' });
    expect(openaiService.summarize).toHaveBeenCalledWith('Some long text', 'short', 'neutral');
  });

  it('eli5 should return explanation', async () => {
    const result = await controller.eli5({ text: 'Complex text' });
    expect(result).toEqual({ explanation: 'Explanation for 5yo' });
    expect(openaiService.explain).toHaveBeenCalledWith('Complex text');
  });

  it('cite should return citation', async () => {
    const result = await controller.cite({ metadata: { title: 'Test' }, format: 'apa' });
    expect(result).toEqual({ citation: 'Generated citation text' });
    expect(citationService.generateCitation).toHaveBeenCalledWith({ title: 'Test' }, 'apa');
  });

  it('ask should return answer', async () => {
    const result = await controller.ask({ text: 'Context', question: 'What is the answer?' });
    expect(result).toEqual({ answer: 'The answer is 42' });
    expect(openaiService.answerQuestion).toHaveBeenCalledWith('Context', 'What is the answer?');
  });

  it('recommendations should return recommendations', async () => {
    const result = await controller.recommendations({ documentId: 'doc123', limit: 5 });
    expect(result).toEqual({ recommendations: [{ id: '1', title: 'Rec 1' }] });
    expect(openaiService.getRecommendations).toHaveBeenCalledWith('doc123', 5);
  });
});
