import { Test, TestingModule } from '@nestjs/testing';
import { Substrate2parachainService } from './substrate2parachain.service';

describe('Substrate2parachainService', () => {
  let service: Substrate2parachainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Substrate2parachainService],
    }).compile();

    service = module.get<Substrate2parachainService>(Substrate2parachainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
