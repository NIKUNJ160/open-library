import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { OpenaiService } from './services/openai.service';
import { CitationService } from './services/citation.service';
import {
  SummarizeRequestDto,
  SummarizeResponseDto,
  Eli5RequestDto,
  Eli5ResponseDto,
  CiteRequestDto,
  CiteResponseDto,
  AskRequestDto,
  AskResponseDto,
  RecommendationsQueryDto,
  RecommendationsResponseDto,
} from './dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly citationService: CitationService,
  ) {}

  @Public()
  @Post('summarize')
  @ApiOperation({ summary: 'Summarize a document' })
  @ApiResponse({ status: 200, description: 'Summary generated successfully', type: SummarizeResponseDto })
  async summarize(@Body() dto: SummarizeRequestDto): Promise<SummarizeResponseDto> {
    const summary = await this.openaiService.summarize(dto.documentUrl || dto.text || '', dto.length, dto.tone);
    return { summary };
  }

  @Public()
  @Post('eli5')
  @ApiOperation({ summary: 'Explain Like I\'m Five' })
  @ApiResponse({ status: 200, description: 'Explanation generated successfully', type: Eli5ResponseDto })
  async eli5(@Body() dto: Eli5RequestDto): Promise<Eli5ResponseDto> {
    const explanation = await this.openaiService.explain(dto.documentUrl || dto.text || '');
    return { explanation };
  }

  @Public()
  @Post('cite')
  @ApiOperation({ summary: 'Generate citations' })
  @ApiResponse({ status: 200, description: 'Citation generated successfully', type: CiteResponseDto })
  async cite(@Body() dto: CiteRequestDto): Promise<CiteResponseDto> {
    const citation = await this.citationService.generateCitation(dto.metadata, dto.format);
    return { citation };
  }

  @Public()
  @Post('ask')
  @ApiOperation({ summary: 'Q&A over a document' })
  @ApiResponse({ status: 200, description: 'Answer generated successfully', type: AskResponseDto })
  async ask(@Body() dto: AskRequestDto): Promise<AskResponseDto> {
    const answer = await this.openaiService.answerQuestion(dto.documentUrl || dto.text || '', dto.question);
    return { answer };
  }

  @Public()
  @Get('recommendations')
  @ApiOperation({ summary: 'Similar content recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations fetched successfully', type: RecommendationsResponseDto })
  async recommendations(@Query() dto: RecommendationsQueryDto): Promise<RecommendationsResponseDto> {
    const recommendations = await this.openaiService.getRecommendations(dto.documentId, dto.limit);
    return { recommendations };
  }
}
