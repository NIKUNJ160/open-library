import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { CustomLogger } from '../../common/logger/logger.service';

@Injectable()
export class CitationService {
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly logger: CustomLogger
  ) {}

  async generateCitation(metadata: Record<string, any>, format: string): Promise<string> {
    // Try simple generation first based on available metadata
    if (metadata.title && metadata.authors && metadata.year) {
      try {
        if (format === 'apa') {
          return `${metadata.authors.join(', ')} (${metadata.year}). ${metadata.title}. ${metadata.publisher || ''}`;
        }
        if (format === 'mla') {
          return `${metadata.authors[0]} et al. "${metadata.title}." ${metadata.publisher || ''}, ${metadata.year}.`;
        }
      } catch (err: any) {
        this.logger.warn(`Failed string citation formatting, falling back to AI: ${err.message}`, 'CitationService');
      }
    }

    // Fallback to OpenAI for complex cases or other formats
    return this.openaiService.generateCitationWithAI(metadata, format);
  }
}
