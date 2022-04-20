import { Test, TestingModule } from '@nestjs/testing';
import { Substrate2substrateService } from './substrate2substrate.service';

describe('Substrate2SubstrateService', () => {
  let service: Substrate2substrateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Substrate2substrateService],
    }).compile();

    service = module.get<Substrate2substrateService>(Substrate2substrateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('subql account filter should return undefined', () => {
    const res1 = service.subqlAccountFilter({ sender: '', recipient: '' });
    expect(res1).toEqual(undefined);

    const res2 = service.subqlAccountFilter({ sender: undefined, recipient: undefined });
    expect(res2).toEqual(undefined);

    const res3 = service.subqlAccountFilter({ sender: null, recipient: null });
    expect(res3).toEqual(undefined);
  });

  it('subql account filter should return both sender and recipient', () => {
    const account = '0x245B4775082C144C22a4874B0fBa8c70c510c5AE';
    const res = service.subqlAccountFilter({
      sender: account,
      recipient: account,
    });

    expect(res).toEqual(
      `or: [ { senderId: { equalTo: ${account} } }, { recipient: { equalTo: ${account} } } ]`
    );
  });

  it('subql account filter should either sender or recipient', () => {
    const account = '0x245B4775082C144C22a4874B0fBa8c70c510c5AE';
    const res1 = service.subqlAccountFilter({ sender: account, recipient: '' });

    expect(res1).toEqual(`senderId: { equalTo: ${account} }`);

    const res2 = service.subqlAccountFilter({ sender: '', recipient: account });

    expect(res2).toEqual(`recipient: { equalTo: ${account} }`);
  });

  it('theGraph account filter should return undefined', () => {
    const res1 = service.theGraphAccountFilter({ sender: '', recipient: '' });
    expect(res1).toEqual(undefined);

    const res2 = service.theGraphAccountFilter({ sender: undefined, recipient: undefined });
    expect(res2).toEqual(undefined);

    const res3 = service.theGraphAccountFilter({ sender: null, recipient: null });
    expect(res3).toEqual(undefined);
  });

  it('theGraph account filter should return both sender and recipient', () => {
    const account = '0x245B4775082C144C22a4874B0fBa8c70c510c5AE';
    const res = service.theGraphAccountFilter({
      sender: account,
      recipient: account,
    });

    expect(res).toEqual(`sender: "${account}", recipient: "${account}"`);
  });

  it('theGraph account filter should either sender or recipient', () => {
    const account = '0x245B4775082C144C22a4874B0fBa8c70c510c5AE';
    const res1 = service.theGraphAccountFilter({ sender: account, recipient: '' });

    expect(res1).toEqual(`sender: "${account}"`);

    const res2 = service.theGraphAccountFilter({ sender: '', recipient: account });

    expect(res2).toEqual(`recipient: "${account}"`);
  });
});
