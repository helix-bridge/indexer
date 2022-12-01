import { SubstrateEvent } from '@subql/types';
import { Block, XcmSentEvent, XcmReceivedEvent } from '../types';
import { AccountHandler } from './account';

const thisChainId = '2000';
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
      const sourceChainId = Object.keys(chainIds).find(id => chainIds[id].length > 0);
      return sourceChainId;
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
    const now = Math.floor(this.timestamp.getTime() / 1000);
    const method = JSON.parse(this.event.extrinsic.extrinsic.method.toString());
    if (method.callIndex !== helixCallMethod) {
        return;
    }
    const currencyId = method.args.currency_id;
    const amount = method.args.amount;
    const dest = method.args.dest;
    const destChain = dest?.v1?.interior?.x2?.[0].parachain;

    const flag = BigInt(amount) % BigInt(1000);
    if (!destChain || flag !== helixFlag) {
      return;
    }

    let index = 0;
    const messageId = this.xcmSendMessageId(destChain);
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

    let recipient = dest?.v1?.interior?.x2?.[1].accountId32?.id;
    if (!recipient) {
        recipient = dest.v1?.interior?.x2?.[1].accountKey20?.key;
    }
    event.sender = this.event.extrinsic.extrinsic.signer.toHex();
    event.recipient = recipient;
    event.amount = BigInt(amount).toString();
    event.txHash = this.extrinsicHash;
    event.timestamp = now;
    event.destChainId = destChain;
    event.block = this.simpleBlock();
    await event.save();
  }

  // save all the faild xcm message
  public async handleXcmMessageReceivedFailed() {
    const sourceChainId =  this.xcmRecvParachainId();
    if (!sourceChainId) {
        return;
    }

    const messageId = this.xcmRecvMessageId(sourceChainId);
    const extrinsicHash = this.blockNumber.toString() + '-' + this.extrinsicIndex;
    let index = 0;
    while (true) {
      const event = await XcmReceivedEvent.get(sourceChainId + '-' + index);
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
    const sourceChainId =  this.xcmRecvParachainId();
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
            const depositHostEvent = events[index-1];
            const feeInfos = JSON.parse(depositHostEvent.event.data.toString());
            let depositRecipientEvent = events[index-2];
            if (depositRecipientEvent.event.method !== 'Deposited' && depositRecipientEvent.event.method !== 'Deposit') {
                depositRecipientEvent = events[index-3];
                if (depositRecipientEvent.event.method !== 'Deposited' && depositRecipientEvent.event.method !== 'Deposit') {
                    return;
                }
            }
            const transferInfos = JSON.parse(depositRecipientEvent.event.data.toString());
            if (feeInfos.length < 2 || transferInfos.length < 2) {
                return;
            }
            const fee = feeInfos.slice(-2)[1];
            const [account, amount] = transferInfos.slice(-2);
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
