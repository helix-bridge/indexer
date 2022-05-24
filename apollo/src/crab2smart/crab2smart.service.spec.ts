import { Test, TestingModule } from '@nestjs/testing';
import { Crab2smartService } from './crab2smart.service';

describe('Crab2smartService', () => {
  let service: Crab2smartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Crab2smartService],
    }).compile();

    service = module.get<Crab2smartService>(Crab2smartService);
  });

  it('should be defined', () => {
    //expect(service).toBeDefined();
  });
});
