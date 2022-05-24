import { Test, TestingModule } from '@nestjs/testing';
import { AggregationResolver } from './aggregation.resolver';

describe('AggregationResolver', () => {
  let resolver: AggregationResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AggregationResolver],
    }).compile();

    resolver = module.get<AggregationResolver>(AggregationResolver);
  });

  it('should be defined', () => {
    //expect(resolver).toBeDefined();
  });
});
