import { Test, TestingModule } from '@nestjs/testing';
import { Darwinia2crabService } from './darwinia2crab.service';

describe('Darwinia2crabService', () => {
  let service: Darwinia2crabService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Darwinia2crabService],
    }).compile();

    service = module.get<Darwinia2crabService>(Darwinia2crabService);
  });

  it('should be defined', () => {
    //expect(service).toBeDefined();
  });
});
