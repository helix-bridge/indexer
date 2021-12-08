import { SubstrateEvent } from '@subql/types';
import { BridgeDispatchEvent, S2SEvent } from '../types';
import { BlockHandler } from './block';

export class EventHandler {
  private event: SubstrateEvent;

  constructor(event: SubstrateEvent) {
    this.event = event;
  }

  get index() {
    return this.event.idx;
  }

  get blockNumber() {
    return this.event.block.block.header.number.toBigInt();
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
    await BlockHandler.ensureBlock(this.blockHash);

    if (this.section === 'substrate2SubstrateBacking') {
      this.handleS2SEvent();
    }

    if (this.section === 'bridgePangolinDispatch') {
      this.handleBridgeDispatchEvent();
    }
  }

  public async handleBridgeDispatchEvent() {
    const event = new BridgeDispatchEvent(`${this.blockNumber}-${this.index}`);
    const [laneId, nonce] = JSON.parse(this.data) as [string, bigint];

    event.index = this.index;
    event.method = this.method;
    event.data = this.data;
    event.blockId = this.blockHash;
    event.messageId = this.s2sEventId(laneId, nonce);

    await event.save();
  }

  public async handleS2SEvent() {
    // data structure: https://github.com/darwinia-network/darwinia-common/blob/master/frame/wormhole/backing/s2s/src/lib.rs

    if (this.method === 'TokenLocked') {
      // [lane_id, message_nonce, token address, sender, recipient, amount]
      const [laneId, nonce, token, sender, recipient, value] = JSON.parse(this.data) as [
        string,
        bigint,
        string | Record<string, any>,
        string,
        string,
        number
      ];
      const event = new S2SEvent(this.s2sEventId(laneId, nonce));

      event.laneId = laneId;
      event.nonce = nonce;
      event.requestTxHash = this.extrinsicHash;
      event.startTimestamp = this.timestamp;
      event.sender = sender;
      event.recipient = recipient;
      event.token = typeof token === 'string' ? token : token.native.address;
      event.amount = value.toString();
      event.result = 0;
      event.endTimestamp = null;
      event.responseTxHash = null;
      event.blockId = this.blockHash;

      await event.save();
    }

    if (this.method === 'TokenLockedConfirmed') {
      // [lane_id, message_nonce, user, amount, result]
      const [laneId, nonce, _1, _2, confirmResult] = JSON.parse(this.data) as [
        string,
        bigint,
        string | Record<string, any>,
        string,
        boolean
      ];

      const event = await S2SEvent.get(this.s2sEventId(laneId, nonce));

      if (event) {
        event.responseTxHash = this.extrinsicHash;
        event.endTimestamp = this.timestamp;
        event.result = confirmResult ? 1 : 2;
        event.blockId = this.blockHash;

        await event.save();
      }
    }

    if (this.method === 'TokenUnlocked') {
      // [lane_id, message_nonce, token_address, recipient, amount]
      const [laneId, nonce, token, recipient, amount] = JSON.parse(this.data) as [
        string,
        bigint,
        string | Record<string, any>,
        string,
        string,
        number
      ];

      const event = await S2SEvent.get(this.s2sEventId(laneId, nonce));

      if (event) {
        event.laneId = laneId;
        event.nonce = nonce;
        event.recipient = recipient;
        event.requestTxHash = this.extrinsicHash;
        event.responseTxHash = this.extrinsicHash;
        event.amount = amount;
        event.token = typeof token === 'string' ? token : token.native.address;
        event.startTimestamp = this.timestamp;
        event.endTimestamp = this.timestamp;
        event.result = 1;
        event.blockId = this.blockHash;
      }
    }
  }

  private s2sEventId(laneId: string, nonce: bigint): string {
    return `${laneId}0x${nonce.toString(16)}`;
  }
}
