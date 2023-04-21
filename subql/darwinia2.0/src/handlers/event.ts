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

  get args() {
    return this.event.extrinsic.extrinsic.args.toString().split(',');
  }

  get extrinsicHash() {
    const i = this.event?.extrinsic?.extrinsic?.hash?.toString();

    return i === 'null' ? undefined : i;
  }

  get timestamp() {
    return this.event.block.timestamp;
  }

  public async save() {
    if (this.section === 'bridgeCrabDispatch') {
      await this.handleBridgeDispatchEvent();
    }
  }

  public async handleBridgeDispatchEvent() {
    const [_, [laneId, nonce], result] = JSON.parse(this.data);
    const event = new BridgeDispatchEvent(this.s2sEventId(laneId, nonce));

    event.index = this.index;
    event.method = this.method;
    event.data = this.data;
    event.block = this.simpleBlock();
    event.timestamp = this.timestamp;
    if (this.method === 'MessageDispatched' && result.err) {
      event.method = 'MessageDispatched(Err)';
    }

    // the call is message_call, and reverted
    if (this.method === 'MessageDispatched') {
      if (this.index > 1) {
        const maybeEthereumExecuteEvent = this.event?.extrinsic?.events[this.index - 2];
        if (
          maybeEthereumExecuteEvent &&
          maybeEthereumExecuteEvent.event.method === 'Executed' &&
          maybeEthereumExecuteEvent.event.section === 'ethereum'
        ) {
          const [_from, _to, _transactionHash, exitReason] = JSON.parse(
            maybeEthereumExecuteEvent.event.data.toString()
          );
          if (exitReason.revert) {
            event.method = 'MessageDispatched(Revert)';
          }
        }
      }
    }

    await event.save();
  }

  private simpleBlock(): Block {
    return {
      blockHash: this.blockHash,
      number: this.blockNumber,
      specVersion: this.event.block.specVersion,
      extrinsicHash: this.extrinsicHash,
    };
  }

  private s2sEventId(laneId: string, nonce: bigint): string {
    return `${laneId}0x${nonce.toString(16)}`;
  }
}
