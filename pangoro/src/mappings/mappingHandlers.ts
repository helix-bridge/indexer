import { SubstrateBlock, SubstrateEvent } from '@subql/types';
import { EventHandler, BlockHandler } from '../handlers';

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  const entity = new BlockHandler(block);

  await entity.save();
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
  const entity = new EventHandler(event);

  await entity.save();
}

// export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {}
