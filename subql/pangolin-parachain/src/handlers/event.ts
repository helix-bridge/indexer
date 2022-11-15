import { SubstrateEvent } from '@subql/types';
import { Block, BridgeDispatchEvent, TransferRecord, RefundTransferRecord } from '../types';
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

  get extrinsicIndex() {
    return this.event?.extrinsic?.idx?.toString();
  }

  get timestamp() {
    return this.event.block.timestamp;
  }

  public async save() {
    if (this.section === 'bridgePangolinDispatch') {
      await this.handleBridgeDispatchEvent();
    }

    if (this.method === 'TokenBurnAndRemoteUnlocked') {
      await this.handleBurnAndRemotedUnlocked();
    }

    if (this.method === 'RemoteUnlockForFailure') {
      await this.handleRemoteUnlockForFailure();
    }

    if (this.method === 'TokenIssuedForFailure') {
      await this.handleTokenIssuedForFailure();
    }
  }

  public async handleBridgeDispatchEvent() {
    const [_, [laneId, nonce], result] = JSON.parse(this.data);
    const event = new BridgeDispatchEvent(this.s2sEventIdWithLaneId(laneId, nonce));

    event.index = this.index;
    event.method = this.method;
    event.data = this.data;
    event.block = this.simpleBlock();
    event.timestamp = this.timestamp;
    if (this.method === 'MessageDispatched' && result.ok === undefined) {
        event.method = 'MessageDispatched(Err)'
    }

    await event.save();
  }

  private async handleBurnAndRemotedUnlocked() {
    // [lane_id, message_nonce, sender, recipient, amount]
    const [_, nonce, from, to, value] = JSON.parse(this.data);
    const event = new TransferRecord(this.s2sEventId(nonce));
    const sender = AccountHandler.formatAddress(from);
    const receiver = AccountHandler.formatAddress(to);
    const [_specVersion, _weight, _gaslimit, _value, fee, _recipient] = this.args;

    event.transaction = this.extrinsicHash;
    event.timestamp = this.timestamp;
    event.sender = sender;
    event.receiver = receiver;
    event.amount = value.toString();
    event.fee = fee;

    await event.save();
  }

  private async handleRemoteUnlockForFailure() {
      const [refundNonce, failureNonce] = JSON.parse(this.data) as [
          bigint,
          bigint,
      ];
      const event = new RefundTransferRecord(this.s2sEventId(refundNonce));
      event.sourceid = this.s2sEventId(failureNonce);
      event.timestamp = this.timestamp;
      event.transaction = this.extrinsicHash;
      await event.save();
  }

  private async handleTokenIssuedForFailure() {
      const [_laneId, failureNonce, _recipient, amount] = JSON.parse(this.data) as [
          string,
          bigint,
          string,
          string
      ];
      const event = await TransferRecord.get(this.s2sEventId(failureNonce));
      if (event) {
          event.withdrawtimestamp = this.timestamp;
          event.withdrawamount = amount;
          event.withdrawtransaction = this.extrinsicHash;
          await event.save();
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

  private s2sEventId(nonce: bigint): string {
    return `0x${nonce.toString(16)}`;
  }

  private s2sEventIdWithLaneId(laneId: string, nonce: bigint): string {
    return `${laneId}0x${nonce.toString(16)}`;
  }
}

