import { SubstrateEvent } from '@subql/types';
import {
  Block,
  BridgeDispatchEvent,
  TransferRecord,
  RefundTransferRecord,
  XcmSentEvent,
  XcmReceivedEvent,
} from '../types';
import { AccountHandler } from './account';

const thisChainId = '2105';
const helixFlag = BigInt(204);

//const kururaChainId = 2000;
const moonriverChainId = 2023;

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

  private xcmSendMessageId(destChainId: string): string {
    const [messageHash] = JSON.parse(this.data) as [string];
    return thisChainId + '-' + destChainId + '-' + messageHash;
  }

  private xcmRecvMessageId(sourceChainId: string): string {
    const [messageHash] = JSON.parse(this.data) as [string];
    return sourceChainId + '-' + thisChainId + '-' + messageHash;
  }

  private xcmRecvParachainId(): string {
    const extrinsicArgs = this.event.extrinsic?.extrinsic?.args?.toString();

    if (!extrinsicArgs) {
      return;
    }
    const chainIds = JSON.parse(extrinsicArgs)?.horizontalMessages;
    const sourceChainId = Object.keys(chainIds).find((id) => chainIds[id].length > 0);
    return sourceChainId;
  }

  public async save() {
    if (this.section === 'bridgeCrabDispatch') {
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

    if (this.section === 'xcmpQueue') {
      if (this.method === 'XcmpMessageSent') {
        await this.handleXcmMessageSent();
      } else if (this.method === 'Success') {
        await this.handleXcmMessageReceivedSuccessed();
      } else if (this.method === 'Fail') {
        await this.handleXcmMessageReceivedFailed();
      }
    }
  }

  public async handleXcmMessageSent() {
    const now = Math.floor(this.timestamp.getTime() / 1000);
    let nonce: number;
    const balanceTransferEvent = this.event?.extrinsic?.events.find((item) => {
      if (item.event.method === 'Transfer') {
        const [_sender, _2, amount] = JSON.parse(item.event.data.toString());
        const flag = BigInt(amount) % BigInt(1000);
        if (flag === helixFlag) {
          return true;
        }
      }
      return false;
    });
    if (!balanceTransferEvent) {
      return;
    }
    const [sender, _2, amount] = JSON.parse(balanceTransferEvent.event.data.toString());

    const args = '[' + this.event.extrinsic.extrinsic.args.toString() + ']';
    const [dest, beneficiary, _assets, _feeAssetItem] = JSON.parse(args);
    const destChainId = dest.v1?.interior?.x1?.parachain;
    if (!destChainId) {
      return;
    }

    let index = 0;
    const messageId = this.xcmSendMessageId(destChainId);
    while (true) {
      const event = await XcmSentEvent.get(messageId + '-' + index);
      if (!event) {
        break;
      }
      // if the same tx hash, don't save again
      if (event.txHash === this.extrinsicHash) {
        return;
      }
      index++;
    }

    const event = new XcmSentEvent(messageId + '-' + index);
    event.sender = AccountHandler.formatAddress(sender);
    event.amount = BigInt(amount).toString();
    event.txHash = this.extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
    if (destChainId == moonriverChainId) {
      event.recipient = beneficiary.v1?.interior?.x1?.accountKey20?.key;
    } else {
      event.recipient = beneficiary.v1?.interior?.x1?.accountId32?.id;
    }
    // TODO current we only support CRAB
    event.token = 'CRAB';
    event.nonce = nonce;
    event.destChainId = dest.v1?.interior?.x1?.parachain;
    await event.save();
  }

  // save all the faild xcm message
  public async handleXcmMessageReceivedFailed() {
    const sourceChainId = this.xcmRecvParachainId();
    if (!sourceChainId) {
      return;
    }

    const messageId = this.xcmRecvMessageId(sourceChainId);
    const extrinsicHash = this.blockNumber.toString() + '-' + this.extrinsicIndex;
    let index = 0;
    while (true) {
      const event = await XcmReceivedEvent.get(messageId + '-' + index);
      if (!event) {
        break;
      }
      // if the same tx hash, don't save again
      if (event.txHash === extrinsicHash) {
        return;
      }
      index++;
    }
    const now = Math.floor(this.timestamp.getTime() / 1000);
    const event = new XcmReceivedEvent(messageId + '-' + index);
    event.txHash = extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
    await event.save();
  }

  public async handleXcmMessageReceivedSuccessed() {
    const sourceChainId = this.xcmRecvParachainId();
    if (!sourceChainId) {
      return;
    }

    const messageId = this.xcmRecvMessageId(sourceChainId);
    const now = Math.floor(this.timestamp.getTime() / 1000);
    let totalAmount = BigInt(0);
    let recvAmount = BigInt(0);
    let recipient: string;

    this.event?.extrinsic?.events.find((item, index, events) => {
      if (item.event.index === this.event.event.index) {
        const feeEvent = events[index - 1];
        const transferEvent = events[index - 2];
        const [_feeAccount, fee] = JSON.parse(feeEvent.event.data.toString());
        const [account, amount] = JSON.parse(transferEvent.event.data.toString());
        totalAmount = BigInt(fee) + BigInt(amount);
        recipient = account;
        recvAmount = BigInt(amount);
      }
    });
    const flag = totalAmount % BigInt(1000);
    if (flag !== helixFlag) {
      return;
    }
    if (!recipient) {
      return;
    }
    let index = 0;
    const extrinsicHash = this.blockNumber.toString() + '-' + this.extrinsicIndex;
    while (true) {
      const event = await XcmReceivedEvent.get(messageId + '-' + index);
      if (!event) {
        break;
      }
      // if the same tx hash, don't save again
      if (event.txHash === extrinsicHash) {
        return;
      }
      index++;
    }
    const event = new XcmReceivedEvent(messageId + '-' + index);
    event.recipient = recipient;
    event.amount = recvAmount.toString();
    event.txHash = extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
    await event.save();
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
      event.method = 'MessageDispatched(Err)';
    }

    await event.save();
  }

  private async handleBurnAndRemotedUnlocked() {
    // [lane_id, message_nonce, sender, recipient, amount]
    const [_, nonce, from, to, value] = JSON.parse(this.data) as [
      string,
      bigint,
      string,
      string,
      number
    ];
    const event = new TransferRecord(this.s2sEventId(nonce));
    const sender = AccountHandler.formatAddress(from);
    const receiver = AccountHandler.formatAddress(to);
    const [_specVersion, _weight, _gasLimit, _value, fee, _recipient] = this.args;

    event.transaction = this.extrinsicHash;
    event.timestamp = this.timestamp;
    event.sender = sender;
    event.receiver = receiver;
    event.amount = value.toString();
    event.fee = fee;

    await event.save();
  }

  private async handleRemoteUnlockForFailure() {
    const [refundNonce, failureNonce] = JSON.parse(this.data) as [bigint, bigint];
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
