import { SubstrateEvent } from '@subql/types';
import { Block, BridgeDispatchEvent } from '../types';

export class EventHandler {
  private event: SubstrateEvent;

  constructor(event: SubstrateEvent) {
    this.event = event;
  }

  get index() {
    return this.event.idx;
  }

  get blockNumber() {
    return this.event.block.block.header.number.toNumber();
  }

  get blockHash() {
    return this.event.block.block.hash.toString();
  }

  get events() {
    return this.event.block.events;
  }

  get section() {
    return this.event.event.section;
  }

  get method() {
    return this.event.event.method;
  }

  get data() {
    return this.event.event.data.toString();
  }

  get extrinsicHash() {
    const i = this.event?.extrinsic?.extrinsic?.hash?.toString();

    return i === 'null' ? undefined : i;
  }

  get timestamp() {
    return this.event.block.timestamp;
  }

  public async save() {
    if (this.section === 'bridgeDarwiniaDispatch') {
      await this.handleBridgeDispatchEvent();
    }
  }

  public async handleBridgeDispatchEvent() {
    const event = new BridgeDispatchEvent(`${this.blockNumber}-${this.index}`);
    const [laneId, nonce] = JSON.parse(this.data) as [string, bigint];

    event.index = this.index;
    event.method = this.method;
    event.data = this.data;
    event.block = this.simpleBlock();
    event.messageId = this.s2sEventId(laneId, nonce);

    await event.save();
  }

  private simpleBlock(): Block {
    return {
      hash: this.blockHash,
      number: this.blockNumber,
      specVersion: this.event.block.specVersion,
    };
  }

  private s2sEventId(laneId: string, nonce: bigint): string {
    return `${laneId}0x${nonce.toString(16)}`;
  }
}
