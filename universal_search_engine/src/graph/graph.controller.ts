import { Controller, Get, Post, Body, Param, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GraphService } from './graph.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Knowledge Graph')
@Controller('graph')
@Public()
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get('entity/:id')
  @ApiOperation({ summary: 'Get a graph entity node and all its first-degree relations' })
  @ApiResponse({ status: 200, description: 'Graph entity and neighbors resolved successfully' })
  async getEntityNeighbors(@Param('id') id: string) {
    return this.graphService.getEntityNeighbors(id);
  }

  @Post('triples/extract')
  @ApiOperation({ summary: 'Extract semantic triples (Subject, Predicate, Object) from raw text payload' })
  @ApiResponse({ status: 200, description: 'Triples extracted successfully' })
  async extractTriples(@Body('text') text: string) {
    return this.graphService.extractTriplesFromText(text);
  }

  @Post('document/:documentId/graph')
  @ApiOperation({ summary: 'Automatically trigger graph entity & relation extraction for an ingested document' })
  @ApiResponse({ status: 200, description: 'Document graphed and saved to Knowledge Graph successfully' })
  async graphDocument(@Param('documentId') documentId: string) {
    return this.graphService.autoGraphDocument(documentId);
  }
}
