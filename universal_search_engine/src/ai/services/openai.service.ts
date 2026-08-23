import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import { CustomLogger } from '../../common/logger/logger.service';

@Injectable()
export class OpenaiService {
  private openai: OpenAI;
  private readonly isConfigured: boolean;
  private readonly modelName: string;

  constructor(private readonly logger: CustomLogger) {
    // Using Nvidia API Integration provided by the user
    const apiKey = process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    this.modelName = process.env.NVIDIA_MODEL || 'openai/gpt-oss-120b';

    if (apiKey && apiKey !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({
        apiKey,
        baseURL,
      });
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
      this.logger.warn('NVIDIA_API_KEY is not configured. AI endpoints will fail.', 'OpenaiService');
    }
  }

  private ensureConfigured() {
    if (!this.isConfigured) {
      throw new HttpException('AI integration is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async summarize(content: string, length: string = 'medium', tone: string = 'formal'): Promise<string> {
    this.ensureConfigured();
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: `You are an expert summarizer. Summarize the content provided by the user. The summary should be of ${length} length and ${tone} tone.` },
          { role: 'user', content: content },
        ],
        temperature: 1,
        top_p: 1,
        max_tokens: 4096,
      });
      return response.choices[0]?.message?.content || 'Could not generate summary.';
    } catch (error: any) {
      this.logger.error(`Failed to summarize: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate summary', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async explain(content: string): Promise<string> {
    this.ensureConfigured();
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: `Explain the following content as if the reader is 5 years old (ELI5). Make it simple, intuitive, and easy to understand.` },
          { role: 'user', content: content },
        ],
        temperature: 1,
        top_p: 1,
        max_tokens: 4096,
      });
      return response.choices[0]?.message?.content || 'Could not explain.';
    } catch (error: any) {
      this.logger.error(`Failed to explain: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate explanation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async answerQuestion(content: string, question: string): Promise<string> {
    this.ensureConfigured();
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: `You are a helpful assistant. Use the provided text or document URL to answer the user's question accurately. If the text does not contain the answer, say so.` },
          { role: 'user', content: `Context: ${content}\n\nQuestion: ${question}` },
        ],
        temperature: 1,
        top_p: 1,
        max_tokens: 4096,
      });
      
      const message = response.choices[0]?.message;
      let finalAnswer = '';
      
      // Support for models that output reasoning (like DeepSeek R1)
      const reasoning = (message as any)?.reasoning_content;
      if (reasoning) {
        finalAnswer += `[Reasoning]\n${reasoning}\n\n[Answer]\n`;
      }
      
      finalAnswer += message?.content || 'Could not answer the question.';
      return finalAnswer;
    } catch (error: any) {
      this.logger.error(`Failed to answer question: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate answer', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getRecommendations(documentId: string, limit: number = 5): Promise<any[]> {
    this.ensureConfigured();
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: `You are a recommendation system. The user will provide a document ID. Provide a JSON array of ${limit} mock recommended documents. Each document should have an 'id', 'title', and 'url'. Respond with valid JSON only, using {"recommendations": [...]}.` },
          { role: 'user', content: `Document ID: ${documentId}` },
        ],
        temperature: 0.1, // Lower temperature for more deterministic JSON
        max_tokens: 1024,
      });
      const content = response.choices[0]?.message?.content || '{"recommendations":[]}';
      // Strip markdown JSON blocks if the model wrapped it
      const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedContent);
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
        model: this.modelName,
        messages: [
          { role: 'system', content: `You are an expert academic citation generator. Given the metadata, generate a citation in ${format} format.` },
          { role: 'user', content: JSON.stringify(metadata) },
        ],
        temperature: 0.2,
      });
      return response.choices[0]?.message?.content || 'Could not generate citation.';
    } catch (error: any) {
      this.logger.error(`Failed to generate citation via AI: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate citation via AI', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createEmbedding(text: string, inputType: 'passage' | 'query' = 'passage'): Promise<number[]> {
    this.ensureConfigured();
    try {
      const embeddingModel = process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/nv-embedqa-e5-v5';
      const response: any = await (this.openai.embeddings.create as any)({
        model: embeddingModel,
        input: text,
        input_type: inputType,
        truncate: 'END',
      });
      return response.data[0].embedding;
    } catch (error: any) {
      this.logger.error(`Failed to generate embedding: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate embedding', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createEmbeddings(texts: string[], inputType: 'passage' | 'query' = 'passage'): Promise<number[][]> {
    this.ensureConfigured();
    if (!texts || texts.length === 0) {
      return [];
    }
    try {
      const embeddingModel = process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/nv-embedqa-e5-v5';
      const response: any = await (this.openai.embeddings.create as any)({
        model: embeddingModel,
        input: texts,
        input_type: inputType,
        truncate: 'END',
      });
      return response.data.map((item: any) => item.embedding);
    } catch (error: any) {
      this.logger.error(`Failed to generate embeddings: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate embeddings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async generateRagAnswer(context: string, question: string): Promise<string> {
    this.ensureConfigured();
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content:
              'You are a knowledgeable and accurate assistant for the Universal Open Knowledge Search Engine. Answer the user\'s question clearly, comprehensively, and truthfully based on the provided context retrieved from knowledge documents. If the context does not contain enough information to answer the question, state that clearly and provide what information is available. Cite key details from the context.',
          },
          {
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${question}\n\nPlease provide a clear, accurate, and well-structured answer based on the context above.`,
          },
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2048,
      });

      const message = response.choices[0]?.message;
      let finalAnswer = '';
      const reasoning = (message as any)?.reasoning_content;
      if (reasoning) {
        finalAnswer += `[Reasoning]\n${reasoning}\n\n[Answer]\n`;
      }
      finalAnswer += message?.content || 'Could not generate an answer from context.';
      return finalAnswer;
    } catch (error: any) {
      this.logger.error(`Failed to generate RAG answer: ${error.message}`, error.stack, 'OpenaiService');
      throw new HttpException('Failed to generate RAG answer', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
