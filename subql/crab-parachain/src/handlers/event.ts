import { SubstrateEvent } from '@subql/types';
import { Block, BridgeDispatchEvent, S2SEvent } from '../types';
import { AccountHandler } from './account';

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

  get eventHash() {
    return this.event.event.hash.toString();
  }

  get timestamp() {
    return this.event.block.timestamp;
  }

  public async save() {
    if (this.section === 'bridgeCrabDispatch') {
      await this.handleBridgeDispatchEvent();
    }

    if (this.method === 'TokenBurnAndRemoteUnlocked') {
      await this.handleBurnAndRemotedUnlocked();
    }

    if (this.method === 'TokenUnlockedConfirmed') {
      await this.handleTokenUnlockedConfirmed();
    }
  }

  public async handleBridgeDispatchEvent() {
    const [_, [laneId, nonce]] = JSON.parse(this.data) as [string, [string, bigint]];
    const event = new BridgeDispatchEvent(this.s2sEventId(laneId, nonce));

    event.index = this.index;
    event.method = this.method;
    event.data = this.data;
    event.block = this.simpleBlock();

    await event.save();
  }

  private async handleBurnAndRemotedUnlocked() {
    // [lane_id, message_nonce, sender, recipient, amount]
    const [laneId, nonce, from, to, value] = JSON.parse(this.data) as [
      string,
      bigint,
      string,
      string,
      number
    ];
    const event = new S2SEvent(this.s2sEventId(laneId, nonce));
    const sender = AccountHandler.formatAddress(from);
    const recipient = AccountHandler.formatAddress(to);
    const [_specVersion, _weight, _value, fee, _recipient] = this.args;

    event.laneId = laneId;
    event.nonce = nonce;
    event.requestTxHash = this.extrinsicHash;
    event.startTimestamp = this.timestamp;
    event.senderId = sender;
    event.recipient = recipient;
    event.amount = value.toString();
    event.result = 0;
    event.endTimestamp = null;
    event.responseTxHash = null;
    event.block = this.simpleBlock();
    event.fee = fee;

    await AccountHandler.ensureAccount(sender);
    await event.save();
  }

  private async handleTokenUnlockedConfirmed() {
    // [lane_id, message_nonce, user, amount, result]
    const [laneId, nonce, from, amount, confirmResult] = JSON.parse(this.data) as [
      string,
      bigint,
      string,
      bigint,
      boolean
    ];
    const sender = AccountHandler.formatAddress(from);
    const event = await S2SEvent.get(this.s2sEventId(laneId, nonce));

    if (event) {
      event.responseTxHash = this.extrinsicHash;
      event.endTimestamp = this.timestamp;
      event.result = confirmResult ? 1 : 2;
      event.block = this.simpleBlock();

      await event.save();

      if (confirmResult) {
        await AccountHandler.updateS2SLockedStatistic(sender, amount);
      }
    }
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
