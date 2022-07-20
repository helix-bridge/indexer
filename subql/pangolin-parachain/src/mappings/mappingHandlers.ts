import { SubstrateEvent } from '@subql/types';
import { EventHandler } from '../handlers';

export async function handleEvent(event: SubstrateEvent): Promise<void> {
  const entity = new EventHandler(event);

  await entity.save();
}
