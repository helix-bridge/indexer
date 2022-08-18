import { SubstrateEvent } from '@subql/types';
import { Block, XcmSentEvent, XcmReceivedEvent } from '../types';

const hostAccount = 'qmmNufxeWaAVLMER2va1v4w2HbuU683c5gGtuxQG4fKTZSb';

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
    if (this.section === 'xcmpQueue') {
      if (this.method === 'XcmpMessageSent') {
        await this.handleXcmMessageSent();
      } else if (this.method === 'Success') {
        // TODO Fail Event
        await this.handleXcmMessageReceived();
      }
    }
  }

  public async handleXcmMessageSent() {
    const [messageHash] = JSON.parse(this.data) as [string];
    const now = Math.floor(this.timestamp.getTime()/1000);
    const balanceTransferEvent = this.event?.extrinsic?.events.find((item) => {
      // tokens (Withdrawn)
      if (item.event.method === 'Withdrawn') {
        const [_1, sender, amount] = JSON.parse(item.event.data.toString());
        const nonce = amount % 1e18;
        // allow some error for the timestamp, ignore timezone
        return nonce > 1659888000 && nonce <= now + 3600 * 24;
      }
      return false;
    });
    if (!balanceTransferEvent) {
      return;
    }
    const [_1, sender, amount] = JSON.parse(balanceTransferEvent.event.data.toString());
    const args = '[' + this.event.extrinsic.extrinsic.args.toString() + ']';
    const [_currencyId, _amount, dest, _destWeight] = JSON.parse(args);

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
    event.sender = sender;
    event.recipient = dest.v1?.interior?.x2[1].accountId32?.id;
    event.amount = amount.toString();
    event.txHash = this.extrinsicHash;
    event.timestamp = now;
    event.destChainId = dest.v1?.interior?.x2[0].parachain;
    event.block = this.simpleBlock();
    await event.save();
  }

  public async handleXcmMessageReceived() {
    const [messageHash] = JSON.parse(this.data) as [string];
    const now = Math.floor(this.timestamp.getTime()/1000);
    let totalAmount: number = 0;
    var recipient:string;
    
    this.event?.extrinsic?.events.forEach((item, index) => {
      if (item.event.method === 'Deposited') {
        const [currencyId, account, amount] = JSON.parse(item.event.data.toString());
        totalAmount = totalAmount + Number(amount);
        if (account !== hostAccount) {
          recipient = account;
        }
      }
    });
    const nonce = totalAmount % 1e18;
    // allow some error for the timestamp, ignore timezone
    if (nonce < 1659888000 || nonce > now + 3600 * 24) {
      return;
    }
    if (!recipient) {
      return;
    }

    let index = 0;
    while (true) {
        const event = await XcmReceivedEvent.get(messageHash + '-' + index);
        if (!event) {
            break;
        }
        // if the same tx hash, don't save again
        if (event.txHash === this.extrinsicHash) {
            return;
        }
        index ++;
    }
    const event = new XcmReceivedEvent(messageHash + '-' + index);
    event.recipient = recipient;
    event.amount = totalAmount.toString();
    event.txHash = this.extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
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
}
