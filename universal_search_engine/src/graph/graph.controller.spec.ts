import { Test, TestingModule } from '@nestjs/testing';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';

describe('GraphController', () => {
  let controller: GraphController;
  let service: jest.Mocked<GraphService>;

  const mockGraphService = () => ({
    getEntityNeighbors: jest.fn(),
    extractTriplesFromText: jest.fn(),
    autoGraphDocument: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GraphController],
      providers: [
        {
          provide: GraphService,
          useFactory: mockGraphService,
        },
      ],
    }).compile();

    controller = module.get<GraphController>(GraphController);
    service = module.get(GraphService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getEntityNeighbors', () => {
    it('should call getEntityNeighbors in service', async () => {
      service.getEntityNeighbors.mockResolvedValue({ entity: { id: 'entity-1' }, outbound: [], inbound: [] } as any);

      const result = await controller.getEntityNeighbors('entity-1');

      expect(service.getEntityNeighbors).toHaveBeenCalledWith('entity-1');
      expect(result.entity.id).toBe('entity-1');
    });
  });

  describe('extractTriples', () => {
    it('should call extractTriplesFromText in service', async () => {
      service.extractTriplesFromText.mockResolvedValue([{ subject: 'A' }] as any);

      const result = await controller.extractTriples('text input');

      expect(service.extractTriplesFromText).toHaveBeenCalledWith('text input');
      expect(result).toEqual([{ subject: 'A' }]);
    });
  });

  describe('graphDocument', () => {
    it('should call autoGraphDocument in service', async () => {
      service.autoGraphDocument.mockResolvedValue({ documentNodeId: 'node-1', nodesCreated: 3, relationsCreated: 4 } as any);

      const result = await controller.graphDocument('doc-1');

      expect(service.autoGraphDocument).toHaveBeenCalledWith('doc-1');
      expect(result.nodesCreated).toBe(3);
    });
  });
});
