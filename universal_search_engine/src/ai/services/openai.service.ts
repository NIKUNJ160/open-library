import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import { CustomLogger } from '../../common/logger/logger.service';

@Injectable()
export class OpenaiService {
  private openai: OpenAI;
  private readonly isConfigured: boolean;

  constructor(private readonly logger: CustomLogger) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({ apiKey });
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
      this.logger.warn('OPENAI_API_KEY is not configured. AI endpoints will fail.', 'OpenaiService');
    }
  }

  private ensureConfigured() {
    if (!this.isConfigured) {
      throw new HttpException('OpenAI integration is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async summarize(content: string, length: string = 'medium', tone: string = 'formal'): Promise<string> {
    this.ensureConfigured();
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are an expert summarizer. Summarize the content provided by the user. The summary should be of ${length} length and ${tone} tone.` },
          { role: 'user', content: content },
        ],
      });
      return response.choices[0].message.content || 'Could not generate summary.';
    } catch (error: any) {
      this.logger.error(`Failed to summarize: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate summary', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async explain(content: string): Promise<string> {
    this.ensureConfigured();
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `Explain the following content as if the reader is 5 years old (ELI5). Make it simple, intuitive, and easy to understand.` },
          { role: 'user', content: content },
        ],
      });
      return response.choices[0].message.content || 'Could not explain.';
    } catch (error: any) {
      this.logger.error(`Failed to explain: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate explanation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async answerQuestion(content: string, question: string): Promise<string> {
    this.ensureConfigured();
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are a helpful assistant. Use the provided text or document URL to answer the user's question accurately. If the text does not contain the answer, say so.` },
          { role: 'user', content: `Context: ${content}\n\nQuestion: ${question}` },
        ],
      });
      return response.choices[0].message.content || 'Could not answer the question.';
    } catch (error: any) {
      this.logger.error(`Failed to answer question: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate answer', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getRecommendations(documentId: string, limit: number = 5): Promise<any[]> {
    this.ensureConfigured();
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are a recommendation system. The user will provide a document ID. Provide a JSON array of ${limit} mock recommended documents. Each document should have an 'id', 'title', and 'url'. Respond with valid JSON only, using {"recommendations": [...]}.` },
          { role: 'user', content: `Document ID: ${documentId}` },
        ],
        response_format: { type: 'json_object' },
      });
      const content = response.choices[0].message.content || '{"recommendations":[]}';
      const parsed = JSON.parse(content);
      return parsed.recommendations || [];
    } catch (error: any) {
      this.logger.error(`Failed to get recommendations: ${error.message}`, error.stack, 'OpenaiService');
      return [];
    }
  }

  async generateCitationWithAI(metadata: Record<string, any>, format: string): Promise<string> {
    this.ensureConfigured();
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are an expert academic citation generator. Given the metadata, generate a citation in ${format} format.` },
          { role: 'user', content: JSON.stringify(metadata) },
        ],
      });
      return response.choices[0].message.content || 'Could not generate citation.';
    } catch (error: any) {
      this.logger.error(`Failed to generate citation via AI: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate citation via AI', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createEmbedding(text: string): Promise<number[]> {
    this.ensureConfigured();
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error: any) {
      this.logger.error(`Failed to generate embedding: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate embedding', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

