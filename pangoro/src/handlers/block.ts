import { SubstrateBlock } from '@subql/types';
import { Block } from '../types/models/Block';

export class BlockHandler {
  private block: SubstrateBlock;

  static async ensureBlock(id: string): Promise<void> {
    const block = await Block.get(id);

    if (!block) {
      await new Block(id).save();
    }
  }

  constructor(block: SubstrateBlock) {
    this.block = block;
  }

  get number() {
    return this.block.block.header.number.toBigInt() || BigInt(0);
  }

  get hash() {
    return this.block.block.hash.toString();
  }

  get specVersion() {
    return this.block.specVersion;
  }

  public async save() {
    const block = new Block(this.hash);

    block.number = this.number;
    block.specVersion = this.specVersion;

    await block.save();
  }
}
