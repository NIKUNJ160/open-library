import { Test, TestingModule } from '@nestjs/testing';
import { CitationService } from './citation.service';
import { OpenaiService } from './openai.service';
import { CustomLogger } from '../../common/logger/logger.service';

describe('CitationService', () => {
  let service: CitationService;
  let openaiService: OpenaiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitationService,
        {
          provide: OpenaiService,
          useValue: {
            generateCitationWithAI: jest.fn().mockResolvedValue('AI generated citation'),
          },
        },
        {
          provide: CustomLogger,
          useValue: {
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CitationService>(CitationService);
    openaiService = module.get<OpenaiService>(OpenaiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate APA citation', async () => {
    const metadata = {
      authors: ['Smith, J.', 'Doe, A.'],
      year: 2023,
      title: 'A Great Book',
      publisher: 'Tech Press',
    };
    const result = await service.generateCitation(metadata, 'apa');
    expect(result).toBe('Smith, J., Doe, A. (2023). A Great Book. Tech Press');
  });

  it('should generate MLA citation', async () => {
    const metadata = {
      authors: ['Smith, J.', 'Doe, A.'],
      year: 2023,
      title: 'A Great Book',
      publisher: 'Tech Press',
    };
    const result = await service.generateCitation(metadata, 'mla');
    expect(result).toBe('Smith, J. et al. "A Great Book." Tech Press, 2023.');
  });

  it('should fallback to AI when fields are missing', async () => {
    const metadata = {
      title: 'A Great Book', // Missing authors and year
    };
    const result = await service.generateCitation(metadata, 'apa');
    expect(result).toBe('AI generated citation');
    expect(openaiService.generateCitationWithAI).toHaveBeenCalledWith(metadata, 'apa');
  });

  it('should handle missing publisher gracefully', async () => {
    const metadata = {
      authors: ['Smith, J.'],
      year: 2023,
      title: 'A Great Book',
    };
    const result = await service.generateCitation(metadata, 'apa');
    expect(result).toBe('Smith, J. (2023). A Great Book. ');
  });
});
