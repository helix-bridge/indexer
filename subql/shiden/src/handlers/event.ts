import { SubstrateEvent } from '@subql/types';
import { Block, XcmSentEvent, XcmReceivedEvent } from '../types';

const thisChainId = '2007';
const helixFlag = BigInt(204);

// X1
const parachainX1Assets = {
  2004: 'PHA',
  2012: 'CSM',
};

// X2
const parachainX2Assets = {
  2000: {
    key: 'generalKey',
    '0x0080': 'KAR',
    '0x0081': 'aUSD',
  },
  2023: {
    key: 'palletInstance',
    10: 'MOVR',
  },
};

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
    const extrinsicArgs = this.event.extrinsic?.extrinsic?.args?.toString();
    // not substrate extrinsic, current not support ethereum tx
    if (!extrinsicArgs) {
      return;
    }
    const args = ('[' + extrinsicArgs + ']').replace('Unlimited', '\"Unlimited\"');
    const [dest, beneficiary, assets, _fee] = JSON.parse(args);

    const destChain = dest?.v1?.interior?.x1?.parachain;
    const amount = assets?.v1?.[0].fun?.fungible;
    if (!destChain || !amount) {
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

    const flag = BigInt(amount) % BigInt(1000);
    if (flag !== helixFlag) {
      return;
    }

    //asset
    const event = new XcmSentEvent(messageId + '-' + index);
    event.destChainId = destChain;
    event.amount = BigInt(amount).toString();
    const asset = assets.v1?.[0].id?.concrete?.interior;
    // local asset
    if (asset) {
      if (asset.here !== undefined) {
        event.token = 'SDN';
      } else {
        // X1
        const parachainNativeToken = parachainX1Assets[asset.x1?.parachain];
        if (parachainNativeToken) {
          event.token = parachainNativeToken;
        } else {
          // X2
          event.token = asset;
          const parachainX2Chain = parachainX2Assets[asset.x2?.[0].parachain];
          if (parachainX2Chain) {
            const parachainX2Token = parachainX2Chain[asset.x2?.[1][parachainX2Chain.key]];
            if (parachainX2Token) {
              event.token = parachainX2Token;
            }
          }
        }
      }
    }

    // recipient
    let recipient = beneficiary.v1?.interior?.x1?.accountId32?.id;
    if (!recipient) {
      recipient = beneficiary.v1?.interior?.x1?.accountKey20?.key;
    }
    event.recipient = recipient;

    event.sender = this.event.extrinsic.extrinsic.signer.toHex();
    event.txHash = this.extrinsicHash;
    event.timestamp = now;
    event.block = this.simpleBlock();
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
        if (feeEvent?.event?.method === 'Issued') {
          const transferEvent = events[index - 2];
          if (transferEvent) {
            const [_feeCurrencyId, _feeAccount, fee] = JSON.parse(feeEvent.event.data.toString());
            const [_currencyId, account, amount] = JSON.parse(transferEvent.event.data.toString());
            totalAmount = BigInt(fee) + BigInt(amount);
            recipient = account;
            recvAmount = BigInt(amount);
          }
          // deposit
        } else {
          for (var offset = 1; offset < index; offset++) {
            let transferEvent = events[index - offset];
            let totalEvent = events[index - offset - 1];
            if (transferEvent.event.method === 'Deposit') {
              if (transferEvent && totalEvent) {
                const [account, amount] = JSON.parse(transferEvent.event.data.toString());
                const [_hostAccount, total] = JSON.parse(totalEvent.event.data.toString());
                totalAmount = BigInt(total);
                recipient = account;
                recvAmount = BigInt(amount);
              }
              break;
            }
          }
        }
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
    event.txHash = extrinsicHash;
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
