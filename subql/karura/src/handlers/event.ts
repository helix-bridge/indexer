import { SubstrateEvent } from '@subql/types';
import { Block, XcmSentEvent, XcmReceivedEvent } from '../types';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { AccountHandler } from './account';

const helixCallMethod = '0x3600';
const helixFlag = BigInt(204);

const foreignAssets = {
    3: 'MOVR',
    13: 'CRAB',
    18: 'SDN',
};

const supportedTokens: string[] = [
    'KAR',
    'KUSD',
    'PHA',
];

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
    const [messageHash] = JSON.parse(this.data) as [string];
    const now = Math.floor(this.timestamp.getTime() / 1000);
    const method = JSON.parse(this.event.extrinsic.extrinsic.method.toString());
    if (method.callIndex !== helixCallMethod) {
        return;
    }
    const currencyId = method.args.currency_id;
    const amount = method.args.amount;
    const dest = method.args.dest;

    const flag = BigInt(amount) % BigInt(1000);
    if (flag !== helixFlag) {
      return;
    }

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
      index++;
    }

    const destChain = dest?.v1?.interior?.x2?.[0].parachain;
    const event = new XcmSentEvent(messageHash + '-' + index);
    if (currencyId) {
        if (currencyId.token !== undefined) {
            if (!supportedTokens.includes(currencyId.token)) {
                return;
            }
            event.token = currencyId.token;
        } else if (currencyId.foreignAsset !== undefined) {
            const foreignAsset = foreignAssets[currencyId.foreignAsset]
            if (!foreignAsset) {
                return;
            }
            event.token = foreignAsset
        } else {
            return;
        }
    }

    const recipient = dest?.v1?.interior?.x2?.[1].accountId32?.id;
    event.sender = this.event.extrinsic.extrinsic.signer.toHex();
    event.recipient = recipient;
    event.amount = amount;
    event.txHash = this.extrinsicHash;
    event.timestamp = now;
    event.destChainId = destChain;
    event.block = this.simpleBlock();
    await event.save();
  }

  // save all the faild xcm message
  public async handleXcmMessageReceivedFailed() {
    const [messageHash] = JSON.parse(this.data) as [string];
    const extrinsicHash = this.blockNumber.toString() + '-' + this.extrinsicIndex;
    let index = 0;
    while (true) {
      const event = await XcmReceivedEvent.get(messageHash + '-' + index);
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
    const event = new XcmReceivedEvent(messageHash + '-' + index);
    event.txHash = extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
    await event.save();
  }

  public async handleXcmMessageReceivedSuccessed() {
    const [messageHash] = JSON.parse(this.data) as [string];
    const now = Math.floor(this.timestamp.getTime() / 1000);
    let totalAmount = BigInt(0);
    let recvAmount = BigInt(0);
    let recipient: string;

    this.event?.extrinsic?.events.find((item, index, events) => {
        if (item.event.index === this.event.event.index) {
            const depositHostEvent = events[index-1];
            const [_feeToken, _hostAccount, fee] = JSON.parse(depositHostEvent.event.data.toString());
            let depositRecipientEvent = events[index-2];
            if (depositRecipientEvent.event.method !== 'Deposited') {
                depositRecipientEvent = events[index-3];
            }
            const [_token, account, amount] = JSON.parse(depositRecipientEvent.event.data.toString());
            totalAmount = BigInt(amount) + BigInt(fee);
            recipient = AccountHandler.formatAddress(account);
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

    const extrinsicHash = this.blockNumber.toString() + '-' + this.extrinsicIndex;
    let index = 0;
    while (true) {
      const event = await XcmReceivedEvent.get(messageHash + '-' + index);
      if (!event) {
        break;
      }
      // if the same tx hash, don't save again
      if (event.txHash === extrinsicHash) {
        return;
      }
      index++;
    }
    const event = new XcmReceivedEvent(messageHash + '-' + index);
    event.recipient = recipient;
    event.amount = recvAmount.toString();
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
