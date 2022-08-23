import { SubstrateEvent } from '@subql/types';
import { Block, BridgeDispatchEvent, S2SEvent, XcmSentEvent, XcmReceivedEvent } from '../types';
import { AccountHandler } from './account';

const hostAccount = '5HMbbQxR81gQU2P7vKKVLyxZMkmwbSeMhjA4ZfNbXfPg1Seu';
const xcmStartTimestamp = 1659888000;
const secondPerDay = 3600 * 24;

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

    if (this.section === 'xcmpQueue') {
      if (this.method === 'XcmpMessageSent') {
        await this.handleXcmMessageSent();
      } else if (this.method === 'Success') {
        await this.handleXcmMessageReceived();
      }
    }
  }

  public async handleXcmMessageSent() {
    const [messageHash] = JSON.parse(this.data) as [string];
    const now = Math.floor(this.timestamp.getTime()/1000);
    var nonce: number;
    const balanceTransferEvent = this.event?.extrinsic?.events.find((item) => {
      if (item.event.method === 'Transfer') {
        const [_sender, _2, amount] = JSON.parse(item.event.data.toString());
        nonce = amount % 1e18;
        // allow some error for the timestamp, ignore timezone
        return nonce > xcmStartTimestamp && nonce <= now + secondPerDay;
      }
      return false;
    });
    if (!balanceTransferEvent) {
      return;
    }
    const [sender, _2, amount] = JSON.parse(balanceTransferEvent.event.data.toString());

    const args = '[' + this.event.extrinsic.extrinsic.args.toString() + ']';
    const [dest, beneficiary, _assets, _feeAssetItem] = JSON.parse(args);

    let index = 0;
    while (true) {
        const event = await XcmSentEvent.get(messageHash + '-' + index);
        if (!event) {
            break;
        }
        // if the same tx hash, don't save again
        if (event.txHash === this.extrinsicHash) {
            return;
        }
        index ++;
    }
        
    const event = new XcmSentEvent(messageHash + '-' + index);
    event.sender = AccountHandler.formatAddress(sender);
;
    event.amount = Number(amount).toString();
    event.txHash = this.extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
    const destChainId = dest.v1?.interior?.x1?.parachain;
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

  public async handleXcmMessageReceived() {
    const [messageHash] = JSON.parse(this.data) as [string];
    const now = Math.floor(this.timestamp.getTime()/1000);
    let totalAmount: number = 0;
    let recvAmount: number = 0;
    var recipient:string;

    this.event?.extrinsic?.events.forEach((item, _index) => {
      if (item.event.method === 'Deposit') {
        const [account, amount] = JSON.parse(item.event.data.toString());
        totalAmount = totalAmount + Number(amount);
        if (account !== hostAccount) {
          recipient = account;
          recvAmount = Number(amount);
        }
      }
    });
    const nonce = totalAmount % 1e18;
    if (nonce < xcmStartTimestamp || nonce > now + secondPerDay) {
      return;
    }
    if (!recipient) {
      return;
    }
    let index = 0;
    const extrinsicHash = this.blockNumber.toString() + '-' + this.extrinsicIndex
    while (true) {
        const event = await XcmReceivedEvent.get(messageHash + '-' + index);
        if (!event) {
            break;
        }
        // if the same tx hash, don't save again
        if (event.txHash === extrinsicHash) {
            return;
        }
        index ++;
    }
    const event = new XcmReceivedEvent(messageHash + '-' + index);
    event.recipient = recipient;
    event.amount = recvAmount.toString();
    event.txHash = extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
    await event.save();
  }

  public async handleBridgeDispatchEvent() {
    const [_, [laneId, nonce]] = JSON.parse(this.data) as [string, [string, bigint]];
    const event = new BridgeDispatchEvent(this.s2sEventId(laneId, nonce));

    event.index = this.index;
    event.method = this.method;
    event.data = this.data;
    event.block = this.simpleBlock();
    event.timestamp = this.timestamp;

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
