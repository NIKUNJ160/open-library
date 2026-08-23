import { Controller, Get, Post, Put, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { Collection } from './entities/collection.entity';
import { CreateCollectionDto, AddItemDto, ExportCitationsDto } from './dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Collections & Citations')
@Controller()
@Public()
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post('collections')
  @ApiOperation({ summary: 'Create a new search result / document collection' })
  @ApiResponse({ status: 201, description: 'Collection successfully created', type: Collection })
  async createCollection(@Body() dto: CreateCollectionDto): Promise<Collection> {
    return this.collectionsService.create(dto);
  }

  @Get('collections')
  @ApiOperation({ summary: 'List all collections' })
  @ApiResponse({ status: 200, description: 'Collections listed successfully', type: [Collection] })
  async listCollections(): Promise<Collection[]> {
    return this.collectionsService.findAll();
  }

  @Get('collections/:id')
  @ApiOperation({ summary: 'Get a specific collection with its items' })
  @ApiResponse({ status: 200, description: 'Collection retrieved successfully', type: Collection })
  async getCollection(@Param('id') id: string): Promise<Collection> {
    return this.collectionsService.findOne(id);
  }

  @Put('collections/:id')
  @ApiOperation({ summary: 'Update collection metadata' })
  @ApiResponse({ status: 200, description: 'Collection updated successfully', type: Collection })
  async updateCollection(
    @Param('id') id: string,
    @Body() dto: CreateCollectionDto,
  ): Promise<Collection> {
    return this.collectionsService.update(id, dto);
  }

  @Delete('collections/:id')
  @ApiOperation({ summary: 'Delete a collection' })
  @ApiResponse({ status: 200, description: 'Collection deleted successfully' })
  async deleteCollection(@Param('id') id: string): Promise<void> {
    return this.collectionsService.delete(id);
  }

  @Post('collections/:id/items')
  @ApiOperation({ summary: 'Add a document/result to a collection' })
  @ApiResponse({ status: 201, description: 'Item added successfully', type: Collection })
  async addItemToCollection(
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ): Promise<Collection> {
    return this.collectionsService.addItem(id, dto);
  }

  @Delete('collections/:id/items/:itemId')
  @ApiOperation({ summary: 'Remove an item from a collection' })
  @ApiResponse({ status: 200, description: 'Item removed successfully', type: Collection })
  async removeItemFromCollection(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ): Promise<Collection> {
    return this.collectionsService.removeItem(id, itemId);
  }

  @Post('citations/export')
  @ApiOperation({ summary: 'Export citations for items or collection in specific format' })
  @ApiResponse({ status: 200, description: 'Citations formatted successfully', type: [String] })
  async exportCitations(@Body() dto: ExportCitationsDto): Promise<string[]> {
    return this.collectionsService.exportCitations(dto);
  }
}
